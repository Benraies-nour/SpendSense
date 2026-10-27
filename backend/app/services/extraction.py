"""
Extraction fallback service.

Used when Azure Document Intelligence finds no items on a receipt.
Sends the raw OCR text to the LLM, which reads it like a human
and returns a list of items (name, total_price, optional quantity).

No categorization is done here — the user assigns categories during review.


"""

import json
from decimal import Decimal, InvalidOperation

from groq import Groq, APIError, APIConnectionError, RateLimitError
from pydantic import BaseModel

from app.core.config import settings
from app.services.ocr import parse_tnd  

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """\
You are a receipt parser. The user will give you the raw text of a receipt.
Extract all purchased items and return them as a JSON array.

Rules:
- Each element must have: "name" (string), "total_price" (string, the amount as written on the receipt).
- Add "quantity" (string) only when it is explicitly written on the receipt.
- Do not invent items or prices.
- Do not categorize items.
- If no items can be found, return an empty array [].
- Return ONLY the JSON array, no explanation, no markdown fences.

Example output:
[
  {"name": "Pain ", "total_price": "0,850"},
  {"name": "Lait 1L", "quantity": "2", "total_price": "2,400"}
]
"""


class ExtractedItem(BaseModel):
    name: str
    quantity: int | None = None
    total_price: Decimal


def _parse_item(raw: dict) -> ExtractedItem | None:
    """Parse one item dict from the LLM response. Returns None on bad data."""
    name = (raw.get("name") or "").strip()
    price_text = raw.get("total_price") or ""

    if not name or not price_text:
        return None

    try:
        total_price = parse_tnd(str(price_text))
    except ValueError:
        return None

    quantity: int | None = None
    qty_text = raw.get("quantity")
    if qty_text:
        try:
            quantity = int(Decimal(str(qty_text)))
        except (InvalidOperation, ValueError):
            pass

    return ExtractedItem(name=name, quantity=quantity, total_price=total_price)


def extract_items_from_text(raw_text: str) -> list[ExtractedItem]:
    """Send raw OCR text to the LLM and return extracted items.

    Returns an empty list when the LLM finds nothing or the text is too short.

    Raises:
        PermissionError  : invalid Groq API key.
        RuntimeError     : rate limit hit or other Groq API error.
        ConnectionError  : cannot reach Groq.
    """
    if not raw_text or len(raw_text.strip()) < 10:
        return []

    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    client = Groq(api_key=settings.groq_api_key)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": raw_text},
            ],
            temperature=0,          # deterministic output
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
    except RateLimitError as e:
        raise RuntimeError(f"Groq rate limit reached: {e}") from e
    except APIConnectionError as e:
        raise ConnectionError(f"Cannot reach Groq: {e}") from e
    except APIError as e:
        raise RuntimeError(f"Groq API error: {e}") from e

    content = response.choices[0].message.content or ""

    # The model returns a JSON object when response_format=json_object is set.
    # We asked for an array, so it may wrap it: {"items": [...]} or {"result": [...]}.
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return []

    # Unwrap if the model returned {"items": [...]} instead of [...]
    if isinstance(parsed, dict):
        for key in ("items", "result", "data", "products"):
            if isinstance(parsed.get(key), list):
                parsed = parsed[key]
                break
        else:
            return []

    if not isinstance(parsed, list):
        return []

    items = [_parse_item(raw) for raw in parsed]
    return [item for item in items if item is not None]

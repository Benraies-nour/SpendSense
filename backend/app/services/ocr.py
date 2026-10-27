"""
OCR service — wraps Azure Document Intelligence.

"""

import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeResult
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError, ServiceRequestError
from pydantic import BaseModel

from app.core.config import settings



class OcrItem(BaseModel):
    name: str
    quantity: int | None = None
    total_price: Decimal


class OcrResult(BaseModel):
    items: list[OcrItem]
    purchased_at: datetime | None = None
    printed_total: Decimal | None = None
    raw_text: str


def parse_tnd(text: str) -> Decimal:
    """Parse a TND amount string into a Decimal with 3 decimal places.

    Raises ValueError when the text cannot be parsed.
    """
    # Keep only digits, commas, dots and spaces.
    cleaned = re.sub(r"[^\d,.\s]", "", text).strip()

    # Find the last separator (comma or dot) — that is the decimal separator.
    match = re.search(r"[,.](?=\d+$)", cleaned)

    if match:
        decimal_pos = match.start()
        integer_part = cleaned[:decimal_pos]
        decimal_part = cleaned[decimal_pos + 1:]
        # Remove thousand separators (spaces, dots, commas) from the integer part.
        integer_part = re.sub(r"[\s,.]", "", integer_part)
        normalized = f"{integer_part}.{decimal_part}"
    else:
        # No separator found — treat as whole dinars with no millimes.
        normalized = re.sub(r"[\s,.]", "", cleaned)

    try:
        return Decimal(normalized).quantize(Decimal("0.001"))
    except InvalidOperation:
        raise ValueError(f"Cannot parse amount: {text!r}")


# Field extraction helpers


def _extract_text(field: dict | None) -> str | None:
    """Return the raw text content of an Azure field, or None."""
    if not field:
        return None
    return field.get("content") or field.get("valueString") or None


def _extract_amount(field: dict | None) -> Decimal | None:
    """Parse a currency field into Decimal using the text content (not the float)."""
    text = _extract_text(field)
    if not text:
        return None
    try:
        return parse_tnd(text)
    except ValueError:
        return None


def _extract_datetime(date_field: dict | None, time_field: dict | None) -> datetime | None:
    """Combine date and time fields into a UTC datetime, or return None."""
    date_val = (date_field or {}).get("valueDate")  

    if not date_val:
        return None

    dt_str = f"{date_val}T{time_val}" if time_val else f"{date_val}T00:00:00"
    try:
        return datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _extract_items(items_field: dict | None) -> list[OcrItem]:
    """Extract the list of items from the Azure Items field."""
    entries = (items_field or {}).get("valueArray") or []
    result: list[OcrItem] = []

    for entry in entries:
        obj = entry.get("valueObject") or {}

        name = _extract_text(obj.get("Description"))
        if not name:
            continue  # skip items without a name

        price_field = obj.get("TotalPrice") or obj.get("Price")
        total_price = _extract_amount(price_field)
        if total_price is None:
            continue  # skip items without a price

        qty_text = _extract_text(obj.get("Quantity"))
        quantity: int | None = None
        if qty_text:
            try:
                quantity = int(Decimal(qty_text))
            except (InvalidOperation, ValueError):
                pass

        result.append(OcrItem(name=name, quantity=quantity, total_price=total_price))

    return result


# Public function

def analyze_receipt(image_bytes: bytes) -> OcrResult:
    """Send receipt image bytes to Azure and return a structured OcrResult.

    Raises:
        ValueError        : no items found and no raw text (unusable image).
        PermissionError   : invalid key or endpoint (401).
        ConnectionError   : network issue or Azure unreachable.
        RuntimeError      : any other Azure error.
    """
    if not settings.azure_di_endpoint or not settings.azure_di_key:
        raise RuntimeError("AZURE_DI_ENDPOINT or AZURE_DI_KEY is not configured.")

    client = DocumentIntelligenceClient(
        settings.azure_di_endpoint,
        AzureKeyCredential(settings.azure_di_key),
    )

    try:
        poller = client.begin_analyze_document("prebuilt-receipt", image_bytes)
        result: AnalyzeResult = poller.result()
    except HttpResponseError as e:
        code = e.error.code if e.error else "unknown"
        msg = e.error.message if e.error else str(e)
        if e.status_code == 401:
            raise PermissionError(f"Azure authentication failed: {msg}") from e
        if e.status_code == 429:
            raise RuntimeError("Azure free tier quota exhausted (500 pages/month).") from e
        raise RuntimeError(f"Azure error [{code}]: {msg}") from e
    except ServiceRequestError as e:
        raise ConnectionError(f"Cannot reach Azure: {e}") from e

    raw_text: str = result.content or ""


    docs = result.documents or []
    fields = docs[0].fields if docs else {}

    items = _extract_items(fields.get("Items"))
    purchased_at = _extract_datetime(
        fields.get("TransactionDate"),
        fields.get("TransactionTime"),
    )
    printed_total = _extract_amount(fields.get("Total"))

    if not items and not raw_text:
        raise ValueError("No items and no text could be extracted from this image.")

    return OcrResult(
        items=items,
        purchased_at=purchased_at,
        printed_total=printed_total,
        raw_text=raw_text,
    )

import base64
import json
from datetime import date

from fastapi import APIRouter, Depends
from groq import Groq
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.category import Category
from app.models.user import User
from app.models.voice_message import VoiceMessage
from app.services.tools import TOOLS, execute_tool
from app.services.tts import speak

MEMORY_WINDOW = 20  # number of past messages (user + assistant) kept as context

router = APIRouter(prefix="/voice", tags=["voice"])

_groq = Groq(api_key=settings.groq_api_key)
MODEL = "openai/gpt-oss-120b"


def _system_prompt(categories: list[Category]) -> str:
    cat_list = ", ".join(c.name for c in categories) or "none"
    return f"""You are Nova, a friendly voice assistant for SpendSense, a personal budget app.
Today's date is {date.today().isoformat()}.

## Language & Tone
The user may speak French, Arabic, Tunisian Darija, English, or a mix.
ALWAYS reply in the SAME language the user used in their last message.
Keep replies very short — one sentence, conversational.
Be warm and friendly, like a close friend helping with budgets, not a formal assistant.
Use informal address in all languages (e.g. "tu" in French, informal in Arabic/Darija, "you" in English).

## User's expense categories
{cat_list}

## Your tools and when to use them

### 1. draft_expense — when the user spends money
Trigger: any mention of buying, paying, or spending something (in any language).
Examples:
- "I bought bread for 1 dinar" → draft_expense(amount="1.000", description="bread", category_name="Groceries", date=today)
- "j'ai payé 5 dinars de café" → draft_expense(amount="5.000", description="coffee", category_name="Food", date=today)
- "chriit khobz b 1 dinar" → draft_expense(amount="1.000", description="bread", category_name="Groceries", date=today)
After calling it, ask for confirmation in the user's language.

### 2. draft_income — when the user receives money
Trigger: any mention of receiving money, salary, or payment (in any language).
Examples:
- "I received my salary of 2000 dinars" → draft_income(amount="2000.000", source="salary", date=today, is_recurring=true)
- "j'ai reçu mon salaire de 2000 dinars" → draft_income(amount="2000.000", source="salary", date=today, is_recurring=true)
After calling it, ask for confirmation in the user's language.

### 3. draft_category — when the user wants a new category
Trigger: any request to create or add a category (in any language).
Example: "create a Transport category with 200 dinars" → draft_category(name="Transport", budget_amount="200.000")
After calling it, ask for confirmation in the user's language.

### 4. get_analytics — when the user asks about their finances
Trigger: any question about spending, income, savings, or budget (in any language).
Pick the right metric and period:
- "how much did I spend this month?" → metric="total_expenses", period="this_month"
- "am I over budget?" → metric="budget_status", period="this_month"
- "how much did I save?" → metric="net_savings", period="this_month"
- "how much did I earn?" → metric="total_income", period="this_month"
Then answer naturally in the user's language using the returned data.

## Rules
- Call a tool whenever the user's intent matches one of the triggers above.
- For draft tools: always include today's date if not mentioned.
- For draft_expense: pick the CLOSEST category from the user's list above.
- Amounts are always in TND with 3 decimal places (e.g. 1.000, 2000.000).
- Never invent numbers for analytics — only use data returned by get_analytics.
- If the user's intent is unclear or unrelated to budgeting, politely say you can help with expenses, income, categories, or budget questions — in their language.
"""


class VoiceChatRequest(BaseModel):
    text: str


class ExpenseDraft(BaseModel):
    type:          str = "expense"
    amount:        str
    description:   str
    category_id:   int | None
    category_name: str
    date:          str


class IncomeDraft(BaseModel):
    type:         str = "income"
    amount:       str
    source:       str
    date:         str
    is_recurring: bool = False


class CategoryDraft(BaseModel):
    type:          str = "category"
    name:          str
    budget_amount: str


Draft = ExpenseDraft | IncomeDraft | CategoryDraft


class VoiceChatResponse(BaseModel):
    reply_text: str
    audio_b64:  str
    draft:      Draft | None = None


@router.post("/chat", response_model=VoiceChatResponse)
def voice_chat(
    body: VoiceChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    categories = session.exec(
        select(Category).where(Category.user_id == current_user.id)
    ).all()

    # ── Load conversation memory (last N messages from DB) ───────
    past = session.exec(
        select(VoiceMessage)
        .where(VoiceMessage.user_id == current_user.id)
        .order_by(VoiceMessage.created_at.desc())
        .limit(MEMORY_WINDOW)
    ).all()
    past = list(reversed(past))  # chronological order

    messages = [
        {"role": "system", "content": _system_prompt(categories)},
        *[{"role": m.role, "content": m.content} for m in past],
        {"role": "user",   "content": body.text},
    ]

    # ── Agentic loop ─────────────────────────────────────────────
    draft: Draft | None = None

    for _ in range(5):
        response = _groq.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )

        msg = response.choices[0].message

        if not msg.tool_calls:
            reply = msg.content or "Je n'ai pas compris."
            break

        messages.append(msg)

        for tc in msg.tool_calls:
            args   = json.loads(tc.function.arguments)
            result = execute_tool(tc.function.name, args, session, current_user.id)
            result_data = json.loads(result)

            # Capture draft if Nova prepared one
            if result_data.get("draft"):
                dtype = result_data.get("type")
                if dtype == "expense":
                    draft = ExpenseDraft(
                        amount        = result_data["amount"],
                        description   = result_data["description"],
                        category_id   = result_data.get("category_id"),
                        category_name = result_data["category_name"],
                        date          = result_data["date"],
                    )
                elif dtype == "income":
                    draft = IncomeDraft(
                        amount       = result_data["amount"],
                        source       = result_data["source"],
                        date         = result_data["date"],
                        is_recurring = result_data.get("is_recurring", False),
                    )
                elif dtype == "category":
                    draft = CategoryDraft(
                        name          = result_data["name"],
                        budget_amount = result_data["budget_amount"],
                    )

            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      result,
            })
    else:
        reply = "Je n'ai pas pu traiter ta demande."

    # ── Persist conversation turn (user + assistant text only) ───
    session.add(VoiceMessage(user_id=current_user.id, role="user",      content=body.text))
    session.add(VoiceMessage(user_id=current_user.id, role="assistant", content=reply))
    session.commit()

    audio_bytes = speak(reply)

    return VoiceChatResponse(
        reply_text=reply,
        audio_b64=base64.b64encode(audio_bytes).decode(),
        draft=draft,
    )

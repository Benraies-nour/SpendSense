"""
Nova agentic loop
"""

import json
import logging
import re
from datetime import date, datetime, timedelta, timezone

from groq import Groq
from sqlmodel import Session, select

from app.core.config import settings
from app.models.category import Category
from app.models.voice_message import VoiceMessage
from app.schemas.voice import CategoryDraft, Draft, ExpenseDraft, IncomeDraft
from app.services.tool_executors import execute_tool
from app.services.tools import TOOLS

_groq = Groq(api_key=settings.groq_api_key)
_log  = logging.getLogger(__name__)

MEMORY_WINDOW    = 10
MAX_ROUNDS       = 5
SESSION_TIMEOUT  = timedelta(minutes=15)


# ── System prompt 

def _build_system_prompt(categories: list[Category]) -> str:
    cat_list = ", ".join(c.name for c in categories) or "none"
    return f"""You are Nova, the voice assistant for SpendSense, a personal budget tracking app.
Today is {date.today().isoformat()}.

YOUR ROLE:
You help the user track their personal finances by voice. You can:
- Log expenses and income (always as a draft the user confirms before saving)
- Create new budget categories
- Answer questions about their spending, income, budget status, and savings


You cannot help with anything outside personal finance tracking — no general questions, no advice, no calculations unrelated to the user's own data. If the user asks something out of scope, say in one sentence that you can only help with budget tracking.

Your replies are spoken aloud by a text-to-speech engine.

OUTPUT FORMAT — absolute rules, no exceptions:
- English only. Always reply in English regardless of what language the user speaks.
- Plain spoken sentences only. No parentheses, no brackets, no markdown, no lists, no dashes, no number prefixes.
- No inline examples. Never write "such as", "for example", or "e.g.".
- One sentence per reply. Only ask a question if a field is truly impossible to infer — amount is the only field you should ever ask for.
- Write amounts as spoken words followed by the word "dinars", never as digits or abbreviations.
- Never output bracket notation like [draft pending] or [draft confirmed]. Those are internal markers only. Your reply must be plain spoken text.




You have tools to log expenses, income, and categories, and to query financial data. Use them whenever the user's request matches what they do.

RULES:
- Call a tool as soon as every required field in its schema can be filled. Infer the rest from the user's words and the context.
- If the amount is missing, ask for it in one short sentence that names what the user is adding phrase it naturally from what the user just said.
- Infer description from whatever the user mentioned ("coffee", "bread", "taxi"). Only ask for description if the user gave absolutely no context.
- Always pick the closest category from the list without asking. Only ask if the list is empty.
- Accept any natural number ("twenty", "about 50") and convert it yourself. Never ask the user to reformat a number.
- Default date is today unless the user says otherwise.
- Available categories: {cat_list}
- Only report numbers returned by tools. Never invent figures.
- A [draft pending] is an amendment ONLY if the user refers to that same item and changes one of its fields
  (amount, category, date, description), for example "actually, make it 30" or "no, it was groceries".
- If the user names a different item, or gives a new amount with a different description, it is a NEW entry.
  Ignore the pending draft and create a new one. Never reuse the pending draft's ID for a new entry.
- When unsure, treat it as a new entry.
"""


# ── Draft helpers
def _parse_draft(result_data: dict) -> Draft | None:
    dtype = result_data.get("type")
    if dtype == "expense":
        return ExpenseDraft(
            amount        = result_data["amount"],
            description   = result_data["description"],
            category_id   = result_data.get("category_id"),
            category_name = result_data["category_name"],
            date          = result_data["date"],
            pending_id    = result_data.get("pending_id"),
        )
    if dtype == "income":
        return IncomeDraft(
            amount       = result_data["amount"],
            source       = result_data["source"],
            date         = result_data["date"],
            is_recurring = result_data.get("is_recurring", False),
            pending_id   = result_data.get("pending_id"),
        )
    if dtype == "category":
        return CategoryDraft(
            name          = result_data["name"],
            budget_amount = result_data["budget_amount"],
            pending_id    = result_data.get("pending_id"),
        )
    return None


def _draft_summary(draft: Draft) -> str:
    """Structured string saved in history so the next turn can handle amendments."""
    if isinstance(draft, ExpenseDraft):
        return f"[draft pending: expense {draft.amount} TND for {draft.description} in {draft.category_name} on {draft.date}]"
    if isinstance(draft, IncomeDraft):
        return f"[draft pending: income {draft.amount} TND from {draft.source} on {draft.date}]"
    if isinstance(draft, CategoryDraft):
        return f"[draft pending: category {draft.name} budget {draft.budget_amount} TND]"
    return "[draft pending]"


# Agentic loop 

def run_agent(text: str, session: Session, user_id: int) -> tuple[str, Draft | None]:
    """Run the Nova agentic loop for one user turn. Returns (reply_text, draft_or_None)."""
    categories: list[Category] = session.exec(
        select(Category).where(Category.user_id == user_id)
    ).all()

    past = session.exec(
        select(VoiceMessage)
        .where(VoiceMessage.user_id == user_id)
        .order_by(VoiceMessage.created_at.desc())
        .limit(MEMORY_WINDOW)
    ).all()
    past = list(reversed(past))

    # Clear history if the user has been idle for more than 15 minutes
    if past:
        last_active = past[-1].created_at
        if not last_active.tzinfo:
            last_active = last_active.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - last_active > SESSION_TIMEOUT:
            past = []

    messages = [
        {"role": "system", "content": _build_system_prompt(categories)},
        *[{"role": m.role, "content": m.content} for m in past],
        {"role": "user", "content": text},
    ]

    draft: Draft | None = None
    reply = None

    for _ in range(MAX_ROUNDS):
        response = _groq.chat.completions.create(
            model       = settings.nova_model,
            messages    = messages,
            tools       = TOOLS,
            tool_choice = "auto",
        )
        msg = response.choices[0].message
        messages.append(msg)

        if not msg.tool_calls:
            # LLM returned a plain reply — done
            reply = msg.content or None
            break

        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments)
                result_json = execute_tool(tc.function.name, args, session, user_id, categories)
            except Exception:
                _log.exception("Tool %s failed with args %s", tc.function.name, tc.function.arguments)
                result_json = json.dumps({"error": "Tool execution failed. Please try again."})

            result_data = json.loads(result_json)
            if result_data.get("draft"):
                draft = _parse_draft(result_data)

            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      result_json,
            })
        # Loop continues — LLM sees tool results and decides whether to call more tools or reply

    # If the loop exhausted without a plain reply, ask the LLM to wrap up naturally
    if reply is None:
        final = _groq.chat.completions.create(
            model       = settings.nova_model,
            messages    = messages,
            tool_choice = "none",
        )
        reply = final.choices[0].message.content or ""

    # Strip internal markers and parentheticals, then enforce single sentence
    reply = re.sub(r'\[[^\]]*\]', '', reply)           # remove [draft pending: ...] etc.
    reply = re.sub(r'\s*\([^)]*\)', '', reply).strip() # remove parentheticals
    # Split on sentence boundaries even when there is no space (e.g. "one?Two")
    sentences = re.split(r'(?<=[.?!])\s*', reply)
    sentences = [s.strip() for s in sentences if s.strip()]
    reply = sentences[0] if sentences else reply

    # Always persist both turns so amendment conversations work
    session.add(VoiceMessage(user_id=user_id, role="user",      content=text))
    session.add(VoiceMessage(user_id=user_id, role="assistant", content=_draft_summary(draft) if draft else reply))
    session.commit()

    return reply, draft

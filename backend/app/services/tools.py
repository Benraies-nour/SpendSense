"""
Groq function-calling tools for Nova.
"""

import json
from datetime import date, timedelta
from decimal import Decimal

from sqlmodel import Session, select

from app.models.category import Category
from app.models.expense import Expense
from app.models.income import Income



TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "draft_expense",
            "description": (
                "Prepare an expense draft for the user to confirm before saving. "
                "Call this whenever the user mentions spending, buying, or paying for something. "
                "Always pick the closest category from the user's category list."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "string",
                        "description": "Amount in TND with 3 decimal places, e.g. '1.000'",
                    },
                    "description": {
                        "type": "string",
                        "description": "Short description in English (e.g. 'bread', 'coffee')",
                    },
                    "category_name": {
                        "type": "string",
                        "description": "Category name from the user's available categories",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format. Use today if not mentioned.",
                    },
                },
                "required": ["amount", "description", "category_name", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "draft_income",
            "description": (
                "Prepare an income draft for the user to confirm before saving. "
                "Call this whenever the user mentions receiving money, being paid, salary, etc."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "string",
                        "description": "Amount in TND with 3 decimal places, e.g. '2000.000'",
                    },
                    "source": {
                        "type": "string",
                        "description": "Source of income in English (e.g. 'salary', 'freelance', 'gift')",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date received in YYYY-MM-DD format. Use today if not mentioned.",
                    },
                    "is_recurring": {
                        "type": "boolean",
                        "description": "True if this is a recurring income like a monthly salary.",
                    },
                },
                "required": ["amount", "source", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "draft_category",
            "description": (
                "Prepare a new budget category for the user to confirm before creating. "
                "Call this when the user wants to add or create a new category."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Category name in English (e.g. 'Transport', 'Entertainment')",
                    },
                    "budget_amount": {
                        "type": "string",
                        "description": "Monthly budget in TND with 3 decimal places, e.g. '200.000'",
                    },
                },
                "required": ["name", "budget_amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_analytics",
            "description": (
                "Query the user's financial data to answer questions about expenses, "
                "income, budget status, category breakdowns, or savings over a time period."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "metric": {
                        "type": "string",
                        "enum": [
                            "total_expenses",
                            "total_income",
                            "budget_status",
                            "category_breakdown",
                            "net_savings",
                        ],
                        "description": "What to compute.",
                    },
                    "period": {
                        "type": "string",
                        "enum": [
                            "today",
                            "this_week",
                            "last_week",
                            "this_month",
                            "last_month",
                            "this_year",
                        ],
                        "description": "Time period for the query.",
                    },
                    "category_name": {
                        "type": "string",
                        "description": "Optional category filter (e.g. 'Groceries').",
                    },
                },
                "required": ["metric", "period"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _find_category(name: str, categories: list[Category]) -> Category | None:
    """Case-insensitive partial match on category name."""
    name_lower = name.lower()
    for cat in categories:
        if cat.name.lower() == name_lower:
            return cat
    for cat in categories:
        if name_lower in cat.name.lower() or cat.name.lower() in name_lower:
            return cat
    return None


def _resolve_period(period: str) -> tuple[date, date]:
    """Convert a natural-language period into (start_date, end_date)."""
    today = date.today()

    if period == "today":
        return today, today
    if period == "this_week":
        start = today - timedelta(days=today.weekday())
        return start, today
    if period == "last_week":
        this_mon = today - timedelta(days=today.weekday())
        last_mon = this_mon - timedelta(days=7)
        last_sun = this_mon - timedelta(days=1)
        return last_mon, last_sun
    if period == "this_month":
        return today.replace(day=1), today
    if period == "last_month":
        first_this = today.replace(day=1)
        last_last  = first_this - timedelta(days=1)
        first_last = last_last.replace(day=1)
        return first_last, last_last
    if period == "this_year":
        return today.replace(month=1, day=1), today

    return today.replace(day=1), today  # fallback: this month


def _d(x) -> Decimal:
    """Quantize to 3 decimal places."""
    return Decimal(x).quantize(Decimal("0.001"))


# ---------------------------------------------------------------------------
# Tool executors
# ---------------------------------------------------------------------------

def execute_tool(
    tool_name: str,
    arguments: dict,
    session: Session,
    user_id: int,
) -> str:
    """Execute a tool and return the result as a JSON string."""

    # ── draft_expense ────────────────────────────────────────────
    if tool_name == "draft_expense":
        categories = session.exec(
            select(Category).where(Category.user_id == user_id)
        ).all()

        cat = _find_category(arguments.get("category_name", ""), categories)
        try:
            amount = str(_d(arguments["amount"]))
        except Exception:
            return json.dumps({"error": "Invalid amount."})

        return json.dumps({
            "draft":         True,
            "type":          "expense",
            "amount":        amount,
            "description":   arguments.get("description", ""),
            "category_id":   cat.id   if cat else None,
            "category_name": cat.name if cat else arguments.get("category_name", ""),
            "date":          arguments.get("date") or date.today().isoformat(),
        })

    # ── draft_income ─────────────────────────────────────────────
    if tool_name == "draft_income":
        try:
            amount = str(_d(arguments["amount"]))
        except Exception:
            return json.dumps({"error": "Invalid amount."})

        return json.dumps({
            "draft":        True,
            "type":         "income",
            "amount":       amount,
            "source":       arguments.get("source", ""),
            "date":         arguments.get("date") or date.today().isoformat(),
            "is_recurring": bool(arguments.get("is_recurring", False)),
        })

    # ── draft_category ───────────────────────────────────────────
    if tool_name == "draft_category":
        try:
            budget = str(_d(arguments["budget_amount"]))
        except Exception:
            return json.dumps({"error": "Invalid budget amount."})

        return json.dumps({
            "draft":         True,
            "type":          "category",
            "name":          arguments.get("name", ""),
            "budget_amount": budget,
        })

    # ── get_analytics ────────────────────────────────────────────
    if tool_name == "get_analytics":
        metric      = arguments.get("metric")
        period      = arguments.get("period", "this_month")
        cat_filter  = arguments.get("category_name")
        start, end  = _resolve_period(period)

        categories = session.exec(
            select(Category).where(Category.user_id == user_id)
        ).all()

        if metric == "total_expenses":
            expenses = session.exec(
                select(Expense).where(Expense.user_id == user_id)
            ).all()
            filtered = [e for e in expenses if start <= e.created_at.date() <= end]
            if cat_filter:
                cat = _find_category(cat_filter, categories)
                if cat:
                    filtered = [e for e in filtered if e.category_id == cat.id]
            total = sum((e.amount for e in filtered), Decimal(0))
            return json.dumps({
                "metric":            "total_expenses",
                "period":            period,
                "start_date":        start.isoformat(),
                "end_date":          end.isoformat(),
                "total":             str(_d(total)),
                "transaction_count": len(filtered),
                "category_filter":   cat_filter,
            })

        if metric == "total_income":
            incomes = session.exec(
                select(Income).where(Income.user_id == user_id)
            ).all()
            filtered = [i for i in incomes if start <= i.received_at.date() <= end]
            total = sum((i.amount for i in filtered), Decimal(0))
            return json.dumps({
                "metric":     "total_income",
                "period":     period,
                "start_date": start.isoformat(),
                "end_date":   end.isoformat(),
                "total":      str(_d(total)),
                "count":      len(filtered),
            })

        if metric == "budget_status":
            expenses = session.exec(
                select(Expense).where(Expense.user_id == user_id)
            ).all()
            per_cat = []
            for cat in categories:
                spent = sum(
                    (e.amount for e in expenses
                     if e.category_id == cat.id
                     and start <= e.created_at.date() <= end),
                    Decimal(0),
                )
                per_cat.append({
                    "category":  cat.name,
                    "budget":    str(_d(cat.budget_amount)),
                    "spent":     str(_d(spent)),
                    "remaining": str(_d(cat.budget_amount - spent)),
                    "over":      spent > cat.budget_amount,
                })
            return json.dumps({
                "metric":     "budget_status",
                "period":     period,
                "start_date": start.isoformat(),
                "end_date":   end.isoformat(),
                "categories": per_cat,
            })

        if metric == "category_breakdown":
            expenses = session.exec(
                select(Expense).where(Expense.user_id == user_id)
            ).all()
            filtered = [e for e in expenses if start <= e.created_at.date() <= end]
            breakdown = []
            for cat in categories:
                spent = sum(
                    (e.amount for e in filtered if e.category_id == cat.id),
                    Decimal(0),
                )
                if spent > 0:
                    breakdown.append({"category": cat.name, "spent": str(_d(spent))})
            return json.dumps({
                "metric":     "category_breakdown",
                "period":     period,
                "start_date": start.isoformat(),
                "end_date":   end.isoformat(),
                "breakdown":  breakdown,
            })

        if metric == "net_savings":
            expenses = session.exec(
                select(Expense).where(Expense.user_id == user_id)
            ).all()
            incomes = session.exec(
                select(Income).where(Income.user_id == user_id)
            ).all()
            total_exp = sum(
                (e.amount for e in expenses if start <= e.created_at.date() <= end),
                Decimal(0),
            )
            total_inc = sum(
                (i.amount for i in incomes if start <= i.received_at.date() <= end),
                Decimal(0),
            )
            return json.dumps({
                "metric":         "net_savings",
                "period":         period,
                "start_date":     start.isoformat(),
                "end_date":       end.isoformat(),
                "total_income":   str(_d(total_inc)),
                "total_expenses": str(_d(total_exp)),
                "net_savings":    str(_d(total_inc - total_exp)),
            })

        return json.dumps({"error": f"Unknown metric: {metric}"})

    return json.dumps({"error": f"Unknown tool: {tool_name}"})

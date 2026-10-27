"""
Tool executors for Nova — implements the logic behind each function call.
"""

import calendar
import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlmodel import Session, select

from app.models.category import Category
from app.models.expense import Expense
from app.models.income import Income
from app.models.pending_transaction import PendingTransaction


# Helpers

def _find_category(name: str, categories: list[Category]) -> Category | None:
    name_lower = name.lower()
    for cat in categories:
        if cat.name.lower() == name_lower:
            return cat
    for cat in categories:
        if name_lower in cat.name.lower() or cat.name.lower() in name_lower:
            return cat
    return None


def _resolve_period(period: str) -> tuple[date, date]:
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
        last_day = calendar.monthrange(today.year, today.month)[1]
        return today.replace(day=1), today.replace(day=last_day)
    if period == "last_month":
        first_this = today.replace(day=1)
        last_last  = first_this - timedelta(days=1)
        first_last = last_last.replace(day=1)
        return first_last, last_last
    if period == "this_year":
        return today.replace(month=1, day=1), today.replace(month=12, day=31)
    return today.replace(day=1), today


def _d(x) -> Decimal:
    return Decimal(x).quantize(Decimal("0.001"))


def _dt_start(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=timezone.utc)


def _dt_end(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=timezone.utc)


def _expenses_in(session: Session, user_id: int, start: date, end: date) -> list[Expense]:
    return session.exec(
        select(Expense)
        .where(Expense.user_id == user_id)
        .where(Expense.created_at >= _dt_start(start))
        .where(Expense.created_at <= _dt_end(end))
    ).all()


def _incomes_in(session: Session, user_id: int, start: date, end: date) -> list[Income]:
    return session.exec(
        select(Income)
        .where(Income.user_id == user_id)
        .where(Income.received_at >= _dt_start(start))
        .where(Income.received_at <= _dt_end(end))
    ).all()


# Tool executors

def execute_tool(
    tool_name:  str,
    arguments:  dict,
    session:    Session,
    user_id:    int,
    categories: list[Category],
) -> str:
    """Execute a tool and return the result as a JSON string."""

    # ── draft_expense 
    if tool_name == "draft_expense":
        cat = _find_category(arguments.get("category_name", ""), categories)
        try:
            amount = str(_d(arguments["amount"]))
        except Exception:
            return json.dumps({"error": "Invalid amount."})

        draft_data = {
            "type":          "expense",
            "amount":        amount,
            "description":   arguments.get("description", ""),
            "category_id":   cat.id   if cat else None,
            "category_name": cat.name if cat else arguments.get("category_name", ""),
            "date":          arguments.get("date") or date.today().isoformat(),
        }
        pt = PendingTransaction(user_id=user_id, type="expense", payload=json.dumps(draft_data))
        session.add(pt)
        session.flush()
        return json.dumps({"draft": True, "pending_id": pt.id, **draft_data})

    # ── draft_income 
    if tool_name == "draft_income":
        try:
            amount = str(_d(arguments["amount"]))
        except Exception:
            return json.dumps({"error": "Invalid amount."})

        draft_data = {
            "type":         "income",
            "amount":       amount,
            "source":       arguments.get("source", ""),
            "date":         arguments.get("date") or date.today().isoformat(),
            "is_recurring": bool(arguments.get("is_recurring", False)),
        }
        pt = PendingTransaction(user_id=user_id, type="income", payload=json.dumps(draft_data))
        session.add(pt)
        session.flush()
        return json.dumps({"draft": True, "pending_id": pt.id, **draft_data})

    # ── draft_category
    if tool_name == "draft_category":
        try:
            budget = str(_d(arguments["budget_amount"]))
        except Exception:
            return json.dumps({"error": "Invalid budget amount."})

        draft_data = {
            "type":          "category",
            "name":          arguments.get("name", ""),
            "budget_amount": budget,
        }
        pt = PendingTransaction(user_id=user_id, type="category", payload=json.dumps(draft_data))
        session.add(pt)
        session.flush()
        return json.dumps({"draft": True, "pending_id": pt.id, **draft_data})

    # ── get_summary 
    if tool_name == "get_summary":
        period      = arguments.get("period", "this_month")
        start, end  = _resolve_period(period)
        expenses    = _expenses_in(session, user_id, start, end)
        incomes     = _incomes_in(session, user_id, start, end)
        total_exp   = sum((e.amount for e in expenses), Decimal(0))
        total_inc   = sum((i.amount for i in incomes),  Decimal(0))
        return json.dumps({
            "period":           period,
            "start_date":       start.isoformat(),
            "end_date":         end.isoformat(),
            "total_expenses":   str(_d(total_exp)),
            "total_income":     str(_d(total_inc)),
            "net_savings":      str(_d(total_inc - total_exp)),
            "expense_count":    len(expenses),
            "income_count":     len(incomes),
        })

    # ── get_budget_status 
    if tool_name == "get_budget_status":
        period      = arguments.get("period", "this_month")
        cat_filter  = arguments.get("category_name")
        start, end  = _resolve_period(period)
        expenses    = _expenses_in(session, user_id, start, end)

        if cat_filter:
            cat = _find_category(cat_filter, categories)
            active_cats = [cat] if cat else categories
        else:
            active_cats = categories

        per_cat = []
        total_budget = Decimal(0)
        total_spent  = Decimal(0)
        for cat in active_cats:
            spent = sum(
                (e.amount for e in expenses if e.category_id == cat.id),
                Decimal(0),
            )
            total_budget += cat.budget_amount
            total_spent  += spent
            per_cat.append({
                "category":  cat.name,
                "budget":    str(_d(cat.budget_amount)),
                "spent":     str(_d(spent)),
                "remaining": str(_d(cat.budget_amount - spent)),
                "over":      spent > cat.budget_amount,
            })

        return json.dumps({
            "period":          period,
            "start_date":      start.isoformat(),
            "end_date":        end.isoformat(),
            "total_budget":    str(_d(total_budget)),
            "total_spent":     str(_d(total_spent)),
            "total_remaining": str(_d(total_budget - total_spent)),
            "category_filter": cat_filter,
            "categories":      per_cat,
        })

    # ── get_recent_transactions 
    if tool_name == "get_recent_transactions":
        period      = arguments.get("period", "this_month")
        cat_filter  = arguments.get("category_name")
        start, end  = _resolve_period(period)
        expenses    = _expenses_in(session, user_id, start, end)
        incomes     = _incomes_in(session, user_id, start, end)
        cat_map     = {c.id: c.name for c in categories}

        if cat_filter:
            cat = _find_category(cat_filter, categories)
            if cat:
                expenses = [e for e in expenses if e.category_id == cat.id]
                incomes  = [] 

        transactions = [
            {
                "type":        "expense",
                "amount":      str(_d(e.amount)),
                "description": e.description or "",
                "category":    cat_map.get(e.category_id, "Unknown"),
                "date":        e.created_at.date().isoformat(),
            }
            for e in expenses
        ] + [
            {
                "type":   "income",
                "amount": str(_d(i.amount)),
                "source": i.source,
                "date":   i.received_at.date().isoformat(),
            }
            for i in incomes
        ]

        transactions.sort(key=lambda t: t["date"], reverse=True)

        
        return json.dumps({
            "period":          period,
            "start_date":      start.isoformat(),
            "end_date":        end.isoformat(),
            "category_filter": cat_filter,
            "count":           len(transactions),
            "transactions":    transactions[:5],
            "more":            len(transactions) > 5,
        })

    return json.dumps({"error": f"Unknown tool: {tool_name}"})

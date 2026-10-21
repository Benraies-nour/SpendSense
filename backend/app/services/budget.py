from decimal import Decimal
from sqlmodel import Session, select
from app.models.income import Income
from app.models.expense import Expense
from app.models.category import Category
from app.schemas.budget import BudgetRead, CategoryBudget

def get_budget(user_id: int, session: Session) -> BudgetRead:

    incomes = session.exec(select(Income).where(Income.user_id == user_id)).all()
    revenu_total = sum(i.amount for i in incomes) or Decimal("0")

    expenses = session.exec(select(Expense).where(Expense.user_id == user_id)).all()
    total_depense = sum(e.amount for e in expenses) or Decimal("0")

    categories = session.exec(select(Category).where(Category.user_id == user_id)).all()

    categories_budget = []
    for cat in categories:
        allocated = cat.budget_amount
        spent = sum(e.amount for e in expenses if e.category_id == cat.id) or Decimal("0")
        remaining = allocated - spent

        categories_budget.append(CategoryBudget(
            category_id=cat.id,
            name=cat.name,
            budget_amount=cat.budget_amount,
            allocated=allocated,
            spent=spent,
            remaining=remaining,
        ))

    return BudgetRead(
        revenu_total=revenu_total,
        total_depense=total_depense,
        solde=revenu_total - total_depense,
        categories=categories_budget,
    )
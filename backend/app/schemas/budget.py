from decimal import Decimal
from sqlmodel import SQLModel

class CategoryBudget(SQLModel):
    category_id: int
    name: str
    budget_amount: Decimal
    allocated: Decimal
    spent: Decimal
    remaining: Decimal


class BudgetRead(SQLModel):
    revenu_total: Decimal
    total_depense: Decimal
    solde: Decimal
    categories: list[CategoryBudget]
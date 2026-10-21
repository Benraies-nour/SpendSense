from decimal import Decimal
from sqlmodel import SQLModel, Field


class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    name: str = Field(index=True)
    budget_amount: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=3)

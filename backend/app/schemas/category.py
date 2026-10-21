from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel


class CategoryCreate(SQLModel):
    name: str
    budget_amount: Decimal


class CategoryUpdate(SQLModel):
    name: Optional[str] = None
    budget_amount: Optional[Decimal] = None


class CategoryRead(SQLModel):
    id: int
    user_id: int
    name: str
    budget_amount: Decimal
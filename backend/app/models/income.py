from datetime import datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field


class Income(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    amount: Decimal = Field(max_digits=12, decimal_places=3)
    source: str  # e.g. salary, freelance
    received_at: datetime
    is_recurring: bool = Field(default=False)
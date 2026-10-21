from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field


class ExpenseSource(str, Enum):
    receipt = "receipt"
    voice = "voice"
    manual = "manual"


class Expense(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    category_id: int = Field(foreign_key="category.id")
    receipt_id: int | None = Field(default=None, foreign_key="receipt.id")
    amount: Decimal = Field(max_digits=12, decimal_places=3)
    description: str | None = None
    source: ExpenseSource
    is_recurring: bool = Field(default=False)
    due_day: int | None = Field(default=None, ge=1, le=31)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
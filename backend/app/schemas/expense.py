from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel
from pydantic import field_validator
from app.models.expense import ExpenseSource


class ExpenseCreate(SQLModel):
    category_id: int
    receipt_id: int | None = None
    amount: Decimal
    description: str | None = None
    source: ExpenseSource
    is_recurring: bool = False
    due_day: int | None = None
    created_at: Optional[datetime] = None

    @field_validator('created_at', mode='after')
    @classmethod
    def created_at_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

class ExpenseUpdate(SQLModel):
    category_id: int | None = None
    amount: Decimal | None = None
    description: str | None = None
    source: ExpenseSource | None = None
    is_recurring: bool | None = None
    due_day: int | None = None
    created_at: Optional[datetime] = None

    @field_validator('created_at', mode='after')
    @classmethod
    def created_at_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

class ExpenseRead(SQLModel):
    id: int
    user_id: int
    category_id: int
    receipt_id: int | None
    amount: Decimal
    description: str | None
    source: ExpenseSource
    is_recurring: bool
    due_day: int | None
    created_at: datetime
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel
from pydantic import field_validator


def _ensure_utc(v: datetime) -> datetime:
    if v.tzinfo is None:
        return v.replace(tzinfo=timezone.utc)
    return v


class IncomeCreate(SQLModel):
    amount: Decimal
    source: str
    received_at: datetime
    is_recurring: bool = False

    @field_validator('received_at', mode='after')
    @classmethod
    def received_at_utc(cls, v: datetime) -> datetime:
        return _ensure_utc(v)


class IncomeUpdate(SQLModel):
    amount: Optional[Decimal] = None
    source: Optional[str] = None
    received_at: Optional[datetime] = None
    is_recurring: Optional[bool] = None

    @field_validator('received_at', mode='after')
    @classmethod
    def received_at_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        return _ensure_utc(v) if v is not None else None


class IncomeRead(SQLModel):
    id: int
    user_id: int
    amount: Decimal
    source: str
    received_at: datetime
    is_recurring: bool





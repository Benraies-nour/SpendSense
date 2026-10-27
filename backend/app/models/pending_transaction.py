from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class PendingTransaction(SQLModel, table=True):
    __tablename__ = "pending_transaction"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    type: str                  
    payload: str                  
    status: str = Field(default="in_progress") 
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=24)
    )

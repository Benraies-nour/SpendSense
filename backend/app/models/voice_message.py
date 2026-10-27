from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class VoiceMessage(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    role: str 
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

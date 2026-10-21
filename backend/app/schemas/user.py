from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel


class UserCreate(SQLModel):
    email: str
    password: str
    name: Optional[str] = None


class UserUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = None


class UserRead(SQLModel):
    id: int
    email: str
    name: Optional[str] = None
    created_at: datetime

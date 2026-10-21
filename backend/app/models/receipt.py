from datetime import datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON


class Receipt(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    purchased_at: datetime
    total: Decimal = Field(max_digits=12, decimal_places=3)
    ocr_raw: dict | None = Field(default=None, sa_column=Column(JSON))


class ReceiptItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    receipt_id: int = Field(foreign_key="receipt.id")
    name: str
    quantity: Decimal | None = Field(default=None, max_digits=12, decimal_places=3)
    total_price: Decimal = Field(max_digits=12, decimal_places=3)
    category_id: int | None = Field(default=None, foreign_key="category.id")

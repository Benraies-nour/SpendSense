from datetime import datetime, timezone
from decimal import Decimal
from sqlmodel import SQLModel
from pydantic import field_validator


# ---------------------------------------------------------------------------
# ReceiptItem schemas
# ---------------------------------------------------------------------------

class ReceiptItemRead(SQLModel):
    id: int
    receipt_id: int
    name: str
    quantity: Decimal | None
    total_price: Decimal
    category_id: int | None = None


# ---------------------------------------------------------------------------
# Receipt schemas
# ---------------------------------------------------------------------------

class ReceiptRead(SQLModel):
    id: int
    user_id: int
    purchased_at: datetime
    total: Decimal
    items: list[ReceiptItemRead] = []


# ---------------------------------------------------------------------------
# Draft returned by POST /receipts/scan (nothing written to the database yet)
# ---------------------------------------------------------------------------

class DraftItem(SQLModel):
    name: str
    quantity: Decimal | None = None
    total_price: Decimal
    category_id: int | None = None   # always null from the scan; user fills it


class ReceiptDraft(SQLModel):
    purchased_at: datetime | None = None   # null when not found on the receipt
    items: list[DraftItem]
    computed_total: Decimal                # sum of item total_prices
    printed_total: Decimal | None = None   # null when not found on the receipt
    extraction_method: str                 # "ocr" or "llm_fallback"
    ocr_text: str                          # passed back at confirm time


# ---------------------------------------------------------------------------
# Request body for POST /receipts/confirm
# ---------------------------------------------------------------------------

class ConfirmItem(SQLModel):
    name: str
    quantity: Decimal | None = None
    total_price: Decimal
    category_id: int                       # required — user assigns a category per item


class ReceiptConfirm(SQLModel):
    purchased_at: datetime
    items: list[ConfirmItem]
    ocr_text: str | None = None

    @field_validator("purchased_at", mode="after")
    @classmethod
    def purchased_at_utc(cls, v: datetime) -> datetime:
        """Attach UTC timezone to naive datetimes (e.g. from the frontend)."""
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

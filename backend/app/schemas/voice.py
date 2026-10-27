from pydantic import BaseModel


class VoiceChatRequest(BaseModel):
    text: str


class ExpenseDraft(BaseModel):
    type:          str = "expense"
    amount:        str
    description:   str
    category_id:   int | None
    category_name: str
    date:          str
    pending_id:    int | None = None


class IncomeDraft(BaseModel):
    type:         str = "income"
    amount:       str
    source:       str
    date:         str
    is_recurring: bool = False
    pending_id:   int | None = None


class CategoryDraft(BaseModel):
    type:          str = "category"
    name:          str
    budget_amount: str
    pending_id:    int | None = None


class PendingStatusUpdate(BaseModel):
    status: str  # "confirmed" | "abandoned"


Draft = ExpenseDraft | IncomeDraft | CategoryDraft


class VoiceChatResponse(BaseModel):
    reply_text: str
    audio_b64:  str
    draft:      Draft | None = None


class TranscribeResponse(BaseModel):
    text: str


class TtsRequest(BaseModel):
    text: str


class TtsResponse(BaseModel):
    audio_b64: str

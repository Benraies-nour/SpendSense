from sqlmodel import SQLModel


class StoreCreate(SQLModel):
    name: str
    category_id: int


class StoreRead(SQLModel):
    id: int
    name: str
    category_id: int

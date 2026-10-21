from sqlmodel import SQLModel, Field


class Store(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category_id: int = Field(foreign_key="category.id")
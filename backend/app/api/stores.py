from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.store import Store
from app.models.user import User
from app.schemas.store import StoreCreate, StoreRead

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("/", response_model=list[StoreRead])
def get_stores(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    stores = session.exec(select(Store)).all()
    return stores


@router.post("/", response_model=StoreRead)
def create_store(
    store: StoreCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_store = Store(**store.model_dump())

    session.add(db_store)
    session.commit()
    session.refresh(db_store)

    return db_store

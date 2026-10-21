from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.deps import get_current_user
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(data: UserUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.post("/", response_model=UserRead)
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == user.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = User(email=user.email, hashed_password=hash_password(user.password), name=user.name)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

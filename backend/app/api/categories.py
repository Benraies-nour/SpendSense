from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryRead])
def get_categories(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Category).where(Category.user_id == current_user.id)).all()


@router.post("/", response_model=CategoryRead)
def create_category(category: CategoryCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    db_category = Category(user_id=current_user.id, **category.model_dump())
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(category_id: int, data: CategoryUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    category = session.get(Category, category_id)
    if not category or category.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    category = session.get(Category, category_id)
    if not category or category.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    session.delete(category)
    session.commit()

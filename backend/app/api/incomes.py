from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.income import Income
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeRead, IncomeUpdate

router = APIRouter(prefix="/incomes", tags=["incomes"])


@router.get("/", response_model=list[IncomeRead])
def get_incomes(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Income).where(Income.user_id == current_user.id)).all()


@router.post("/", response_model=IncomeRead)
def create_income(income: IncomeCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    db_income = Income(user_id=current_user.id, **income.model_dump())
    session.add(db_income)
    session.commit()
    session.refresh(db_income)
    return db_income


@router.patch("/{income_id}", response_model=IncomeRead)
def update_income(income_id: int, data: IncomeUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    income = session.get(Income, income_id)
    if not income or income.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Income not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(income, field, value)
    session.commit()
    session.refresh(income)
    return income


@router.delete("/{income_id}", status_code=204)
def delete_income(income_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    income = session.get(Income, income_id)
    if not income or income.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Income not found")
    session.delete(income)
    session.commit()

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseRead

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("/", response_model=ExpenseRead)
def create_expense(expense: ExpenseCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    data = expense.model_dump(exclude_none=True)
    db_expense = Expense(user_id=current_user.id, **data)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense


@router.get("/", response_model=list[ExpenseRead])
def get_expenses(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Expense).where(Expense.user_id == current_user.id)).all()


@router.patch("/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, data: ExpenseUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    expense = session.get(Expense, expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(expense, key, value)
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    expense = session.get(Expense, expense_id)
    if not expense or expense.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")
    session.delete(expense)
    session.commit()

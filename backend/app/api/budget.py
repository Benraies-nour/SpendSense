from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.budget import BudgetRead
from app.services.budget import get_budget

router = APIRouter(prefix="/budget", tags=["budget"])

@router.get("/", response_model=BudgetRead)
def read_budget(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return get_budget(user_id=current_user.id, session=session)
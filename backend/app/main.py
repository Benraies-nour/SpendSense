import logging

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from app.core.config import settings
from app.core.database import get_session

logger = logging.getLogger("spendsense")
from app.api.auth import router as auth_router
from app.api.expenses import router as expenses_router
from app.api.incomes import router as incomes_router
from app.api.users import router as users_router
from app.api.stores import router as stores_router
from app.api.receipts import router as receipts_router
from app.api.categories import router as categories_router
from app.api.budget import router as budget_router
from app.api.voice import router as voice_router

app = FastAPI(title="SpendSense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(expenses_router)
app.include_router(incomes_router)
app.include_router(users_router)
app.include_router(stores_router)
app.include_router(receipts_router)
app.include_router(categories_router)
app.include_router(budget_router)
app.include_router(voice_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    origin = request.headers.get("origin", "")
    headers = {"Access-Control-Allow-Origin": origin} if origin in settings.cors_origins_list else {}
    return JSONResponse(status_code=500, content={"detail": "Internal server error."}, headers=headers)


@app.get("/")
def root():
    return {"message": "SpendSense API is running"}


@app.get("/health")
def health_check(session: Session = Depends(get_session)):
    try:
        session.exec(select(1))
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok"}
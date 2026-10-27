import base64
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from groq import Groq
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.pending_transaction import PendingTransaction
from app.models.user import User
from app.models.voice_message import VoiceMessage
from app.schemas.voice import (
    PendingStatusUpdate,
    TranscribeResponse,
    TtsRequest,
    TtsResponse,
    VoiceChatRequest,
    VoiceChatResponse,
)
from app.services.tts import speak
from app.services.voice_agent import run_agent

router = APIRouter(prefix="/voice", tags=["voice"])

_groq = Groq(api_key=settings.groq_api_key)


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    audio_bytes = await audio.read()
    result = _groq.audio.transcriptions.create(
        file=(audio.filename or "audio.webm", io.BytesIO(audio_bytes), audio.content_type or "audio/webm"),
        model="whisper-large-v3-turbo",
    )
    return TranscribeResponse(text=result.text)


@router.post("/tts", response_model=TtsResponse)
def tts(
    body: TtsRequest,
    current_user: User = Depends(get_current_user),
):
    return TtsResponse(audio_b64=base64.b64encode(speak(body.text)).decode())


@router.post("/chat", response_model=VoiceChatResponse)
def voice_chat(
    body: VoiceChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    reply, draft = run_agent(body.text, session, current_user.id)
    return VoiceChatResponse(
        reply_text = reply,
        audio_b64  = base64.b64encode(speak(reply)).decode(),
        draft      = draft,
    )


@router.patch("/pending/{pending_id}", status_code=204)
def resolve_pending(
    pending_id: int,
    body: PendingStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    pt = session.get(PendingTransaction, pending_id)
    if not pt or pt.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pending transaction not found.")
    if body.status not in ("confirmed", "abandoned"):
        raise HTTPException(status_code=422, detail="status must be 'confirmed' or 'abandoned'.")
    pt.status = body.status

    if body.status == "abandoned":
        # Erase the draft context from history so Nova doesn't resurface it
        pending_msg = session.exec(
            select(VoiceMessage)
            .where(VoiceMessage.user_id == pt.user_id)
            .where(VoiceMessage.content.like("[draft pending:%"))
            .order_by(VoiceMessage.created_at.desc())
            .limit(1)
        ).first()
        if pending_msg:
            user_msg = session.exec(
                select(VoiceMessage)
                .where(VoiceMessage.user_id == pt.user_id)
                .where(VoiceMessage.role == "user")
                .where(VoiceMessage.created_at <= pending_msg.created_at)
                .order_by(VoiceMessage.created_at.desc())
                .limit(1)
            ).first()
            session.delete(pending_msg)
            if user_msg:
                session.delete(user_msg)
    else:
        # Confirmed — close the draft in history so amendments don't re-trigger it
        session.add(VoiceMessage(
            user_id = pt.user_id,
            role    = "assistant",
            content = f"[draft confirmed: {pt.type}]",
        ))

    session.commit()

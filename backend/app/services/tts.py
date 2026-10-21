import asyncio
import io
import edge_tts

VOICE_FR = "fr-FR-DeniseNeural"
VOICE_AR = "ar-TN-ReemNeural"


def _detect_voice(text: str) -> str:
    """Use Arabic voice if text contains Arabic characters, French otherwise."""
    if any("؀" <= ch <= "ۿ" for ch in text):
        return VOICE_AR
    return VOICE_FR


async def _synthesize(text: str) -> bytes:
    voice = _detect_voice(text)
    communicate = edge_tts.Communicate(text, voice)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()


def speak(text: str) -> bytes:
    """Convert text to MP3 audio bytes. Detects language automatically."""
    return asyncio.run(_synthesize(text))

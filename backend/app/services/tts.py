import asyncio
import io
import re
import edge_tts

VOICE_FR = "fr-FR-DeniseNeural"
VOICE_AR = "ar-TN-ReemNeural"
VOICE_EN = "en-US-JennyNeural"

_FRENCH_ACCENTS = re.compile(r"[àâäéèêëîïôùûüçœæ]", re.IGNORECASE)
# Only words that do not exist in English
_FRENCH_WORDS   = re.compile(r"\b(je|tu|nous|vous|ils|elles|avec|pour|dans|très|mais|aussi|cette|votre|bonjour|merci|oui|non|dépense|revenu|catégorie|ajouté|dépensé|acheté|payé|reçu)\b", re.IGNORECASE)


def _detect_voice(text: str) -> str:
    """Pick voice by language: Arabic → AR, French → FR, otherwise English."""
    if any("؀" <= ch <= "ۿ" for ch in text):
        return VOICE_AR
    if _FRENCH_ACCENTS.search(text) or _FRENCH_WORDS.search(text):
        return VOICE_FR
    return VOICE_EN


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

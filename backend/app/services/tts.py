import asyncio
import io

import edge_tts

VOICE = "en-US-JennyNeural"


async def _synthesize(text: str) -> bytes:
    communicate = edge_tts.Communicate(text, VOICE)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()


def speak(text: str) -> bytes:
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_synthesize(text))
    finally:
        loop.close()

import openai
import os
from dotenv import load_dotenv

load_dotenv()

def _get_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. "
            "Copy backend/.env.example to backend/.env and add your key."
        )
    return openai.AsyncOpenAI(api_key=api_key)

async def transcribe_audio(file_path: str) -> str:
    """Send audio file to OpenAI Whisper and return transcript."""
    client = _get_client()
    with open(file_path, "rb") as f:
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="text",
        )
    return response.strip()
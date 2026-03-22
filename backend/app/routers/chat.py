from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.agent import run_agent_stream
from app.services.memory import clear_history

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    session_id: str = "default"

@router.post("/chat")
async def chat(body: ChatRequest):
    if not body.question.strip():
        return {"error": "Question cannot be empty"}
    return StreamingResponse(
        run_agent_stream(body.question, body.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

@router.delete("/chat/{session_id}")
async def clear_session(session_id: str):
    await clear_history(session_id)
    return {"cleared": session_id}

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.app.services.agent_old import run_agent_stream

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

@router.post("/chat")
async def chat(body: ChatRequest):
    if not body.question.strip():
        return {"error": "Question cannot be empty"}
    return StreamingResponse(
        run_agent_stream(body.question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
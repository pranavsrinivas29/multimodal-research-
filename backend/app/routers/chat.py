from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.agent import run_agent_stream
from app.services.memory import clear_history
from app.dependencies import get_current_user

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    session_id: str = "default"

@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    if not body.question.strip():
        return {"error": "Question cannot be empty"}

    # Scope session to user
    session_key = f"{current_user['user_id']}:{body.session_id}"

    return StreamingResponse(
        run_agent_stream(
            body.question,
            session_id=session_key,
            user_id=current_user["user_id"],
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.delete("/chat/{session_id}")
async def clear_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    session_key = f"{current_user['user_id']}:{session_id}"
    await clear_history(session_key)
    return {"cleared": session_key}

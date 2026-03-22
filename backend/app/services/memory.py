import os
import json
import asyncio
from typing import List
from dotenv import load_dotenv
import redis.asyncio as aioredis

load_dotenv()

REDIS_URL   = os.getenv("REDIS_URL", "redis://redis:6379")
MAX_HISTORY = 10  # keep last 10 turns per session
TTL_SECONDS = 60 * 60 * 24  # 24 hours

def _client():
    return aioredis.from_url(REDIS_URL, decode_responses=True)

async def get_history(session_id: str) -> List[dict]:
    """Return conversation history for a session as list of {role, content}."""
    try:
        r = _client()
        raw = await r.get(f"session:{session_id}")
        await r.aclose()
        if not raw:
            return []
        return json.loads(raw)
    except Exception as e:
        print(f"[Memory] get_history failed: {e}")
        return []

async def append_turn(session_id: str, question: str, answer: str):
    """Append a Q&A turn to session history."""
    try:
        r = _client()
        key = f"session:{session_id}"
        raw = await r.get(key)
        history = json.loads(raw) if raw else []

        history.append({"role": "user",      "content": question})
        history.append({"role": "assistant", "content": answer})

        # Keep only last MAX_HISTORY turns
        if len(history) > MAX_HISTORY * 2:
            history = history[-(MAX_HISTORY * 2):]

        await r.set(key, json.dumps(history), ex=TTL_SECONDS)
        await r.aclose()
    except Exception as e:
        print(f"[Memory] append_turn failed: {e}")

async def clear_history(session_id: str):
    """Clear session history."""
    try:
        r = _client()
        await r.delete(f"session:{session_id}")
        await r.aclose()
    except Exception as e:
        print(f"[Memory] clear_history failed: {e}")

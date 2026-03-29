import os
import json
import asyncpg
from typing import List
from dotenv import load_dotenv
import redis.asyncio as aioredis

load_dotenv()

REDIS_URL   = os.getenv("REDIS_URL", "redis://redis:6379")
PG_DSN      = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/research")
MAX_HISTORY = 10
TTL_SECONDS = 60 * 60 * 24

# ── Redis (short-term, fast) ──────────────────────────────────────────────────

def _redis():
    return aioredis.from_url(REDIS_URL, decode_responses=True)

async def get_history(session_id: str) -> List[dict]:
    try:
        r = _redis()
        raw = await r.get(f"session:{session_id}")
        await r.aclose()
        if raw:
            return json.loads(raw)
    except Exception as e:
        print(f"[Memory] Redis get failed: {e}")
    return []

async def append_turn(session_id: str, question: str, answer: str):
    try:
        r = _redis()
        key = f"session:{session_id}"
        raw = await r.get(key)
        history = json.loads(raw) if raw else []
        history.append({"role": "user",      "content": question})
        history.append({"role": "assistant", "content": answer})
        if len(history) > MAX_HISTORY * 2:
            history = history[-(MAX_HISTORY * 2):]
        await r.set(key, json.dumps(history), ex=TTL_SECONDS)
        await r.aclose()
    except Exception as e:
        print(f"[Memory] Redis append failed: {e}")

async def clear_history(session_id: str):
    try:
        r = _redis()
        await r.delete(f"session:{session_id}")
        await r.aclose()
    except Exception as e:
        print(f"[Memory] Redis clear failed: {e}")

# ── Postgres (long-term, persisted) ──────────────────────────────────────────

async def _pg():
    return await asyncpg.connect(PG_DSN)

async def ensure_history_table():
    conn = await _pg()
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id         SERIAL PRIMARY KEY,
            user_id    TEXT NOT NULL,
            role       TEXT NOT NULL,
            content    TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    await conn.close()

async def save_turn_to_db(user_id: str, question: str, answer: str):
    """Persist a Q&A turn to Postgres for long-term history."""
    try:
        await ensure_history_table()
        conn = await _pg()
        await conn.executemany(
            "INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)",
            [(user_id, "user", question), (user_id, "assistant", answer)]
        )
        await conn.close()
    except Exception as e:
        print(f"[Memory] DB save failed: {e}")

async def load_history_from_db(user_id: str, limit: int = 20) -> List[dict]:
    """Load last N messages for a user from Postgres."""
    try:
        await ensure_history_table()
        conn = await _pg()
        rows = await conn.fetch(
            """SELECT role, content FROM chat_history
               WHERE user_id=$1
               ORDER BY created_at DESC
               LIMIT $2""",
            user_id, limit
        )
        await conn.close()
        # Reverse so oldest first
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
    except Exception as e:
        print(f"[Memory] DB load failed: {e}")
        return []

async def clear_history_from_db(user_id: str):
    try:
        conn = await _pg()
        await conn.execute("DELETE FROM chat_history WHERE user_id=$1", user_id)
        await conn.close()
    except Exception as e:
        print(f"[Memory] DB clear failed: {e}")
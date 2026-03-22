import os
import asyncpg
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt

load_dotenv()

SECRET_KEY  = os.getenv("JWT_SECRET_KEY", "change-me-in-production-use-long-random-string")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7  # 1 week

PG_DSN = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/research")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str, email: str) -> str:
    expires = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expires},
        SECRET_KEY, algorithm=ALGORITHM,
    )

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

# ── DB ────────────────────────────────────────────────────────────────────────

async def _pg():
    return await asyncpg.connect(PG_DSN)

async def ensure_users_table():
    conn = await _pg()
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id    TEXT PRIMARY KEY,
            email      TEXT UNIQUE NOT NULL,
            password   TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    # Add user_id column to sources if not exists
    await conn.execute("""
        ALTER TABLE sources ADD COLUMN IF NOT EXISTS user_id TEXT
    """)
    await conn.close()

async def create_user(user_id: str, email: str, password: str) -> dict:
    await ensure_users_table()
    conn = await _pg()
    try:
        await conn.execute(
            "INSERT INTO users (user_id, email, password) VALUES ($1, $2, $3)",
            user_id, email, hash_password(password)
        )
    finally:
        await conn.close()
    return {"user_id": user_id, "email": email}

async def get_user_by_email(email: str) -> Optional[dict]:
    await ensure_users_table()
    conn = await _pg()
    row = await conn.fetchrow("SELECT * FROM users WHERE email=$1", email)
    await conn.close()
    return dict(row) if row else None

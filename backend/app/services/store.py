import os
import hashlib
from typing import List
from dotenv import load_dotenv
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue
)
import asyncpg

load_dotenv()

COLLECTION = "research_chunks"
VECTOR_SIZE = 1536
QDRANT_URL  = os.getenv("QDRANT_URL", "http://qdrant:6333")
PG_DSN      = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/research")

def _qdrant():
    return AsyncQdrantClient(url=QDRANT_URL)

async def ensure_collection():
    client = _qdrant()
    existing = [c.name for c in (await client.get_collections()).collections]
    if COLLECTION not in existing:
        await client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
    await client.close()

async def save_chunks(chunks: list):
    await ensure_collection()
    client = _qdrant()
    points = [
        PointStruct(
            id=int(hashlib.md5(c.chunk_id.encode()).hexdigest(), 16) % (2**63),
            vector=c.vector,
            payload={
                "chunk_id":    c.chunk_id,
                "source_id":   c.source_id,
                "label":       c.label,
                "source_type": c.source_type,
                "text":        c.text,
                "chunk_index": c.chunk_index,
                "user_id":     getattr(c, "user_id", ""),
            }
        ) for c in chunks
    ]
    await client.upsert(collection_name=COLLECTION, points=points)
    await client.close()

async def search_chunks(
    query_vector: List[float],
    top_k: int = 20,
    user_id: str = None,
) -> list:
    """Search chunks — optionally filter by user_id for isolation."""
    client = _qdrant()

    query_filter = None
    if user_id:
        query_filter = Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        )

    results = await client.search(
        collection_name=COLLECTION,
        query_vector=query_vector,
        limit=top_k,
        with_payload=True,
        query_filter=query_filter,
    )
    await client.close()
    return [
        {
            "score":       r.score,
            "text":        r.payload["text"],
            "source_id":   r.payload["source_id"],
            "label":       r.payload["label"],
            "source_type": r.payload["source_type"],
            "chunk_index": r.payload["chunk_index"],
        }
        for r in results
    ]

async def delete_chunks_by_source(source_id: str):
    client = _qdrant()
    try:
        existing = [c.name for c in (await client.get_collections()).collections]
        if COLLECTION not in existing:
            return
        await client.delete(
            collection_name=COLLECTION,
            points_selector=Filter(
                must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
            ),
        )
    finally:
        await client.close()

# ── Postgres ──────────────────────────────────────────────────────────────────

async def _pg():
    return await asyncpg.connect(PG_DSN)

async def ensure_tables():
    conn = await _pg()
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS sources (
            source_id   TEXT PRIMARY KEY,
            label       TEXT NOT NULL,
            source_type TEXT NOT NULL,
            chunk_count INT  NOT NULL,
            user_id     TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    await conn.execute("ALTER TABLE sources ADD COLUMN IF NOT EXISTS user_id TEXT")
    await conn.close()

async def save_source(source_id, label, source_type, chunk_count, user_id=""):
    await ensure_tables()
    conn = await _pg()
    await conn.execute(
        """INSERT INTO sources (source_id, label, source_type, chunk_count, user_id)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (source_id) DO UPDATE SET label=$2, chunk_count=$4""",
        source_id, label, source_type, chunk_count, user_id,
    )
    await conn.close()

async def list_sources_for_user(user_id: str) -> list:
    await ensure_tables()
    conn = await _pg()
    rows = await conn.fetch(
        "SELECT source_id, label, source_type, chunk_count, created_at FROM sources WHERE user_id=$1 ORDER BY created_at DESC",
        user_id,
    )
    await conn.close()
    return [dict(r) for r in rows]

async def list_all_sources() -> list:
    await ensure_tables()
    conn = await _pg()
    rows = await conn.fetch(
        "SELECT source_id, label, source_type, chunk_count, created_at FROM sources ORDER BY created_at DESC"
    )
    await conn.close()
    return [dict(r) for r in rows]

async def delete_source_for_user(source_id: str, user_id: str) -> bool:
    conn = await _pg()
    result = await conn.execute(
        "DELETE FROM sources WHERE source_id=$1 AND user_id=$2",
        source_id, user_id,
    )
    await conn.close()
    if result == "DELETE 0":
        return False
    await delete_chunks_by_source(source_id)
    return True

async def delete_source_by_id(source_id: str) -> bool:
    conn = await _pg()
    result = await conn.execute("DELETE FROM sources WHERE source_id=$1", source_id)
    await conn.close()
    if result == "DELETE 0":
        return False
    await delete_chunks_by_source(source_id)
    return True

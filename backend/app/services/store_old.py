import os, hashlib
from typing import List
from dotenv import load_dotenv
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
import asyncpg

load_dotenv()

COLLECTION = "research_chunks"
VECTOR_SIZE = 1536
QDRANT_URL  = os.getenv("QDRANT_URL", "http://localhost:6333")
PG_DSN      = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/research")

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
            payload={"chunk_id": c.chunk_id, "source_id": c.source_id, "label": c.label,
                     "source_type": c.source_type, "text": c.text, "chunk_index": c.chunk_index}
        ) for c in chunks
    ]
    await client.upsert(collection_name=COLLECTION, points=points)
    await client.close()

async def search_chunks(query_vector: List[float], top_k: int = 20) -> list:
    client = _qdrant()
    results = await client.search(collection_name=COLLECTION, query_vector=query_vector,
                                   limit=top_k, with_payload=True)
    await client.close()
    return [{"score": r.score, "text": r.payload["text"], "source_id": r.payload["source_id"],
             "label": r.payload["label"], "source_type": r.payload["source_type"],
             "chunk_index": r.payload["chunk_index"]} for r in results]

async def delete_chunks_by_source(source_id: str):
    client = _qdrant()
    await client.delete(collection_name=COLLECTION,
        points_selector=Filter(must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]))
    await client.close()

async def _pg():
    return await asyncpg.connect(PG_DSN)

async def ensure_tables():
    conn = await _pg()
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS sources (
            source_id TEXT PRIMARY KEY, label TEXT NOT NULL,
            source_type TEXT NOT NULL, chunk_count INT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    await conn.close()

async def save_source(source_id, label, source_type, chunk_count):
    await ensure_tables()
    conn = await _pg()
    await conn.execute(
        "INSERT INTO sources (source_id, label, source_type, chunk_count) VALUES ($1,$2,$3,$4) "
        "ON CONFLICT (source_id) DO UPDATE SET label=$2, chunk_count=$4",
        source_id, label, source_type, chunk_count)
    await conn.close()

async def list_all_sources() -> list:
    await ensure_tables()
    conn = await _pg()
    rows = await conn.fetch(
        "SELECT source_id, label, source_type, chunk_count, created_at FROM sources ORDER BY created_at DESC")
    await conn.close()
    return [dict(r) for r in rows]

async def delete_source_by_id(source_id: str) -> bool:
    conn = await _pg()
    result = await conn.execute("DELETE FROM sources WHERE source_id=$1", source_id)
    await conn.close()
    if result == "DELETE 0":
        return False
    await delete_chunks_by_source(source_id)
    return True
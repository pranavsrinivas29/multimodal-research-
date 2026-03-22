import os
import asyncio
from typing import List
from dotenv import load_dotenv

load_dotenv()

COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")
USE_COHERE = bool(COHERE_API_KEY)

async def rerank(question: str, chunks: List[dict], top_k: int = 5) -> List[dict]:
    """
    Rerank chunks by relevance to the question.
    Uses Cohere if COHERE_API_KEY is set, otherwise keyword overlap fallback.
    """
    if not chunks:
        return chunks
    if USE_COHERE:
        return await _rerank_cohere(question, chunks, top_k)
    return _rerank_fallback(question, chunks, top_k)

async def _rerank_cohere(question: str, chunks: List[dict], top_k: int) -> List[dict]:
    try:
        import cohere
        co = cohere.AsyncClient(COHERE_API_KEY)
        docs = [c["text"] for c in chunks]
        result = await co.rerank(
            model="rerank-english-v3.0",
            query=question,
            documents=docs,
            top_n=top_k,
        )
        reranked = []
        for r in result.results:
            chunk = chunks[r.index].copy()
            chunk["rerank_score"] = round(r.relevance_score, 4)
            reranked.append(chunk)
        return reranked
    except Exception as e:
        print(f"[Reranker] Cohere failed, using fallback: {e}")
        return _rerank_fallback(question, chunks, top_k)

def _rerank_fallback(question: str, chunks: List[dict], top_k: int) -> List[dict]:
    """Keyword overlap reranking — no external API needed."""
    q_words = set(question.lower().split())
    scored = []
    for chunk in chunks:
        text_words = set(chunk["text"].lower().split())
        overlap = len(q_words & text_words) / max(len(q_words), 1)
        combined = chunk["score"] * 0.7 + overlap * 0.3
        scored.append({**chunk, "rerank_score": round(combined, 4)})
    scored.sort(key=lambda x: x["rerank_score"], reverse=True)
    return scored[:top_k]

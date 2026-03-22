import time
import asyncio
from typing import AsyncGenerator
from app.services.store import search_chunks
from app.services.embedder import embed_single
from app.services.synthesizer import stream_answer
from app.services.reranker import rerank
from app.services.memory import get_history, append_turn
from app.services.tracker import log_query_run
from app.services.evaluator import evaluate_faithfulness

async def run_agent_stream(
    question: str,
    session_id: str = "default",
) -> AsyncGenerator[str, None]:
    """
    Full Phase 5 pipeline:
    1. Load session history from Redis
    2. Embed question
    3. Retrieve top-20 chunks from Qdrant
    4. Rerank to top-5 (Cohere or keyword fallback)
    5. Stream GPT-4o answer with history context + citations
    6. Save turn to Redis
    7. Log to MLflow in background
    """
    start = time.time()

    # Step 1: load history
    history = await get_history(session_id)

    # Step 2+3: embed + retrieve
    vector = await embed_single(question)
    chunks = await search_chunks(vector, top_k=20)

    if not chunks:
        yield "data: No relevant sources found. Please upload some documents first.\n\n"
        yield "data: [DONE]\n\n"
        return

    # Step 4: rerank to top-5
    chunks = await rerank(question, chunks, top_k=5)

    # Step 5: stream answer
    full_answer = []
    completion_tokens = 0

    async for token in stream_answer(question, chunks, history=history):
        full_answer.append(token.replace("\\n", "\n"))
        completion_tokens += 1
        yield f"data: {token}\n\n"

    yield "data: [DONE]\n\n"

    answer_text = "".join(full_answer)
    latency_ms = (time.time() - start) * 1000
    prompt_tokens = sum(len(c["text"].split()) for c in chunks) + len(question.split())

    # Step 6: save to Redis (non-blocking)
    asyncio.create_task(append_turn(session_id, question, answer_text))

    # Step 7: log to MLflow (non-blocking)
    asyncio.create_task(_log_and_eval(
        question=question,
        answer=answer_text,
        chunks=chunks,
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    ))

async def _log_and_eval(question, answer, chunks, latency_ms, prompt_tokens, completion_tokens):
    eval_score = await evaluate_faithfulness(question, answer, chunks)
    await log_query_run(
        question=question,
        answer=answer,
        chunks=chunks,
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        eval_score=eval_score,
    )
    print(f"[MLflow] Logged — latency: {latency_ms:.0f}ms eval: {eval_score:.2f}")

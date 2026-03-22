import time
import asyncio
from typing import AsyncGenerator
from app.services.store import search_chunks
from app.services.embedder import embed_single
from app.services.synthesizer import stream_answer
from app.services.tracker import log_query_run
from app.services.evaluator import evaluate_faithfulness

async def run_agent_stream(question: str) -> AsyncGenerator[str, None]:
    """
    Full pipeline with MLflow tracking:
    1. Embed question
    2. Retrieve chunks from Qdrant
    3. Stream GPT-4o answer with citations
    4. Log everything to MLflow in background
    """
    start = time.time()

    # Step 1+2: retrieve
    vector = await embed_single(question)
    chunks = await search_chunks(vector, top_k=8)

    if not chunks:
        yield "data: No relevant sources found. Please upload some documents first.\n\n"
        yield "data: [DONE]\n\n"
        return

    # Step 3: stream answer, collect full text + token counts
    full_answer = []
    prompt_tokens = 0
    completion_tokens = 0

    async for token in stream_answer(question, chunks):
        full_answer.append(token.replace("\\n", "\n"))
        completion_tokens += 1  # approximate — 1 token per chunk
        yield f"data: {token}\n\n"

    yield "data: [DONE]\n\n"

    # Step 4: log to MLflow in background (don't block the response)
    answer_text = "".join(full_answer)
    latency_ms = (time.time() - start) * 1000

    # Rough prompt token estimate: context + question
    prompt_tokens = sum(len(c["text"].split()) for c in chunks) + len(question.split())

    asyncio.create_task(_log_and_eval(
        question=question,
        answer=answer_text,
        chunks=chunks,
        latency_ms=latency_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    ))

async def _log_and_eval(question, answer, chunks, latency_ms, prompt_tokens, completion_tokens):
    """Run eval and log to MLflow — both happen after response is streamed."""
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

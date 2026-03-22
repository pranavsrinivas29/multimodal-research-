from typing import AsyncGenerator, List
from app.services.store import search_chunks
from app.services.embedder import embed_single
from app.services.synthesizer import stream_answer

async def run_agent_stream(question: str) -> AsyncGenerator[str, None]:
    vector = await embed_single(question)
    chunks = await search_chunks(vector, top_k=8)

    if not chunks:
        yield "data: No relevant sources found. Please upload some documents first.\n\n"
        yield "data: [DONE]\n\n"
        return

    async for token in stream_answer(question, chunks):
        yield f"data: {token}\n\n"

    yield "data: [DONE]\n\n"
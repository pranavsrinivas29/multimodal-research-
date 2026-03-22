import os
from typing import AsyncGenerator, List
import openai
from dotenv import load_dotenv

load_dotenv()

def _get_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    return openai.AsyncOpenAI(api_key=api_key)

def _build_context(chunks: List[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(f"[{i}] Source: {chunk['label']} (score: {chunk['score']:.2f})\n{chunk['text']}")
    return "\n\n---\n\n".join(parts)

SYSTEM_PROMPT = """You are a research assistant. Answer the user's question using ONLY the provided source excerpts.

Rules:
- Cite sources inline using [1], [2], etc. matching the source numbers given
- If multiple sources support a point, cite all of them e.g. [1][3]
- Be concise and direct
- If the sources don't contain enough information to answer, say so clearly
- Never make up information not present in the sources
- End your answer with a ## Sources section listing which sources you used"""

async def stream_answer(question: str, chunks: List[dict]) -> AsyncGenerator[str, None]:
    client = _get_client()
    context = _build_context(chunks)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Source excerpts:\n\n{context}\n\n---\n\nQuestion: {question}"},
    ]
    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        stream=True,
        temperature=0.2,
        max_tokens=1024,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content.replace("\n", "\\n")
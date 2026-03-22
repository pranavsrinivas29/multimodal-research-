import os
from typing import AsyncGenerator, List
import openai
from dotenv import load_dotenv

load_dotenv()

def _get_client():
    return openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

def _build_context(chunks: List[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        score = chunk.get("rerank_score", chunk.get("score", 0))
        parts.append(f"[{i}] Source: {chunk['label']} (score: {score:.3f})\n{chunk['text']}")
    return "\n\n---\n\n".join(parts)

SYSTEM_PROMPT = """You are a research assistant with memory of the conversation.
Answer the user's question using ONLY the provided source excerpts.

Rules:
- Cite sources inline using [1], [2], etc.
- If multiple sources support a point, cite all e.g. [1][3]
- Be concise and direct
- If sources lack enough info, say so clearly
- Never make up information not in the sources
- You may reference previous conversation turns for context
- End with a ## Sources section listing sources used"""

async def stream_answer(
    question: str,
    chunks: List[dict],
    history: List[dict] = None,
) -> AsyncGenerator[str, None]:
    client = _get_client()
    context = _build_context(chunks)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Inject conversation history (last 6 turns max to save tokens)
    if history:
        messages.extend(history[-6:])

    messages.append({
        "role": "user",
        "content": f"Source excerpts:\n\n{context}\n\n---\n\nQuestion: {question}"
    })

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

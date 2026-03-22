import os
import openai
from typing import List
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 100

def _get_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    return openai.AsyncOpenAI(api_key=api_key)

async def embed_single(text: str) -> List[float]:
    client = _get_client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[text],
    )
    return response.data[0].embedding

async def embed_chunks(chunks) -> list:
    client = _get_client()
    texts = [c.text for c in chunks]
    all_vectors = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        response = await client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        batch_vectors = [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
        all_vectors.extend(batch_vectors)
    for chunk, vector in zip(chunks, all_vectors):
        chunk.vector = vector
    return chunks
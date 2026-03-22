import uuid
import asyncio
from app.services.chunker import chunk_text
from app.services.embedder import embed_chunks
from app.services.store import save_source, save_chunks
from app.services.scraper import scrape_url
from app.services.pdf_parser import parse_pdf

async def ingest_pdf(contents: bytes, filename: str) -> dict:
    source_id = str(uuid.uuid4())
    text = await asyncio.to_thread(parse_pdf, contents)
    if not text.strip():
        raise ValueError("Could not extract text from PDF.")
    chunks = chunk_text(text, source_id=source_id, label=filename, source_type="pdf")
    chunks_with_vectors = await embed_chunks(chunks)
    await save_source(source_id=source_id, label=filename, source_type="pdf", chunk_count=len(chunks))
    await save_chunks(chunks_with_vectors)
    return {"source_id": source_id, "label": filename, "chunks": len(chunks), "status": "indexed"}

async def ingest_url(url: str) -> dict:
    source_id = str(uuid.uuid4())
    text, title = await asyncio.to_thread(scrape_url, url)
    if not text.strip():
        raise ValueError(f"Could not extract content from URL: {url}")
    label = title or url
    chunks = chunk_text(text, source_id=source_id, label=label, source_type="url")
    chunks_with_vectors = await embed_chunks(chunks)
    await save_source(source_id=source_id, label=label, source_type="url", chunk_count=len(chunks))
    await save_chunks(chunks_with_vectors)
    return {"source_id": source_id, "label": label, "chunks": len(chunks), "status": "indexed"}
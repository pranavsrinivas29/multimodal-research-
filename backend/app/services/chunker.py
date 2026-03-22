from typing import List
from dataclasses import dataclass, field

CHUNK_SIZE = 512
CHUNK_OVERLAP = 52
CHARS_PER_TOKEN = 4

@dataclass
class Chunk:
    chunk_id: str
    source_id: str
    label: str
    source_type: str
    text: str
    chunk_index: int
    vector: List[float] = field(default_factory=list)

def chunk_text(text, source_id, label, source_type, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP) -> List[Chunk]:
    max_chars = chunk_size * CHARS_PER_TOKEN
    overlap_chars = overlap * CHARS_PER_TOKEN
    raw_chunks = _split_recursive(text.strip(), max_chars, overlap_chars)
    return [
        Chunk(chunk_id=f"{source_id}_{i}", source_id=source_id, label=label,
              source_type=source_type, text=chunk, chunk_index=i)
        for i, chunk in enumerate(raw_chunks) if chunk.strip()
    ]

def _split_recursive(text, max_chars, overlap):
    if len(text) <= max_chars:
        return [text]
    for sep in ["\n\n", "\n", ". ", " ", ""]:
        if sep in text:
            parts = text.split(sep)
            chunks, current = [], ""
            for part in parts:
                candidate = current + sep + part if current else part
                if len(candidate) <= max_chars:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    overlap_text = current[-overlap:] if len(current) > overlap else current
                    current = overlap_text + sep + part if overlap_text else part
            if current:
                chunks.append(current)
            return [c for c in chunks if c.strip()]
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + max_chars])
        start += max_chars - overlap
    return chunks
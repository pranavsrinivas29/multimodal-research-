from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.services.ingest import ingest_pdf, ingest_url

router = APIRouter()

class URLRequest(BaseModel):
    url: str

class IngestResponse(BaseModel):
    source_id: str
    label: str
    chunks: int
    status: str

@router.post("/ingest/pdf", response_model=IngestResponse)
async def ingest_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if file.content_type != "application/pdf" and not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(413, "File too large. Max 50MB.")
    result = await ingest_pdf(contents, file.filename)
    return result

@router.post("/ingest/url", response_model=IngestResponse)
async def ingest_url_endpoint(body: URLRequest):
    if not body.url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http:// or https://")
    result = await ingest_url(body.url)
    return result

@router.get("/sources")
async def list_sources():
    from app.services.store import list_all_sources
    return await list_all_sources()

@router.delete("/sources/{source_id}")
async def delete_source(source_id: str):
    from app.services.store import delete_source_by_id
    deleted = await delete_source_by_id(source_id)
    if not deleted:
        raise HTTPException(404, "Source not found")
    return {"deleted": source_id}
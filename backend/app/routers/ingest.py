from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from app.services.ingest import ingest_pdf, ingest_url
from app.services.store import list_sources_for_user, delete_source_for_user
from app.dependencies import get_current_user

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
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if file.content_type != "application/pdf" and not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(413, "File too large. Max 50MB.")
    result = await ingest_pdf(contents, file.filename, user_id=current_user["user_id"])
    return result

@router.post("/ingest/url", response_model=IngestResponse)
async def ingest_url_endpoint(
    body: URLRequest,
    current_user: dict = Depends(get_current_user),
):
    if not body.url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http:// or https://")
    result = await ingest_url(body.url, user_id=current_user["user_id"])
    return result

@router.get("/sources")
async def list_sources(current_user: dict = Depends(get_current_user)):
    return await list_sources_for_user(current_user["user_id"])

@router.delete("/sources/{source_id}")
async def delete_source(
    source_id: str,
    current_user: dict = Depends(get_current_user),
):
    deleted = await delete_source_for_user(source_id, current_user["user_id"])
    if not deleted:
        raise HTTPException(404, "Source not found")
    return {"deleted": source_id}

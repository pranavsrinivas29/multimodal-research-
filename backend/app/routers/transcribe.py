from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.whisper import transcribe_audio
import tempfile, os

router = APIRouter()

ALLOWED_TYPES = {"audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg"}
MAX_SIZE_MB = 25

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported audio type: {file.content_type}")

    contents = await file.read()

    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File too large. Max {MAX_SIZE_MB}MB.")

    suffix = "." + (file.filename.split(".")[-1] if file.filename else "webm")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        text = await transcribe_audio(tmp_path)
        return {"transcript": text, "filename": file.filename}
    finally:
        os.unlink(tmp_path)

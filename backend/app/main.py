from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import transcribe, health, ingest, chat, stats

app = FastAPI(title="Research Agent API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(transcribe.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


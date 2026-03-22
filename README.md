# Research Agent — Phase 1

Multi-source research assistant with voice input, RAG, LangGraph agent, and MLflow tracking.

## Phase 1 scope
- FastAPI backend with OpenAI Whisper transcription endpoint
- React frontend with mic recording, transcript display, source uploader (PDF + URL)
- Backend health check with live status indicator in UI
- Docker Compose setup for local development

---

## Quick start

### 1. Clone and configure

```bash
cd research-agent
cp backend/.env.example backend/.env
# Edit backend/.env and add your OPENAI_API_KEY
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### 3. Run locally (without Docker)

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Project structure

```
research-agent/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app + CORS
│   │   ├── routers/
│   │   │   ├── health.py         # GET /health
│   │   │   └── transcribe.py     # POST /api/transcribe
│   │   └── services/
│   │       └── whisper.py        # OpenAI Whisper wrapper
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Root layout + chat state
│   │   ├── api/client.js         # API calls to backend
│   │   ├── hooks/
│   │   │   └── useVoiceRecorder.js  # MediaRecorder hook
│   │   └── components/
│   │       ├── ChatInput.jsx     # Text + mic input bar
│   │       ├── ChatMessage.jsx   # Message bubbles
│   │       ├── MicButton.jsx     # Animated mic button
│   │       ├── SourceUploader.jsx # PDF/URL source panel
│   │       └── StatusBar.jsx     # Backend health indicator
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## API reference

### `POST /api/transcribe`
Accepts a multipart audio file, returns transcript.

**Request**: `multipart/form-data` with `file` field (webm, wav, mp3, mp4, ogg)

**Response**:
```json
{
  "transcript": "What are the key risks mentioned in the Q3 report?",
  "filename": "recording.webm"
}
```

---

## What's coming in Phase 2
- Ingestion pipeline: chunk PDFs + URLs, embed with `text-embedding-3-small`
- Qdrant vector store (Docker)
- PostgreSQL for document metadata
- LlamaIndex document parsing
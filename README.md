# Research Agent — Multi-Source AI Research Assistant

A production-grade AI research assistant built end-to-end across 6 phases. Upload PDFs or URLs, ask questions by typing or speaking, and get streamed GPT-4o answers with inline citations — all tracked in MLflow with per-user isolation.

---

## What it does

- **Voice input** — speak your question, Whisper transcribes it in real time
- **Multi-source ingestion** — upload PDFs or paste URLs, chunked and embedded into a vector store
- **RAG pipeline** — semantic search → reranking → GPT-4o synthesis with inline citations
- **Conversation memory** — follow-up questions work, history persists across logins
- **MLflow observability** — every query logs latency, token count, cost, and faithfulness score
- **Auth + user isolation** — JWT login, each user sees only their own sources and chat history

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  Voice Input │ Source Uploader │ Chat UI │ MLflow Dashboard  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼──────────────────────────────────┐
│                      FastAPI Backend                         │
│  /auth  │  /ingest  │  /chat (SSE)  │  /sources  │  /stats  │
└──┬──────────┬────────────┬──────────────┬───────────────────┘
   │          │            │              │
   ▼          ▼            ▼              ▼
Postgres   Qdrant       Redis          MLflow
(users,   (vectors)   (sessions)    (experiments)
 sources,
 history)
```

### Request flow
```
User asks question
  → embed question (text-embedding-3-small)
  → search Qdrant top-20 (filtered by user_id)
  → rerank to top-5 (keyword overlap / Cohere)
  → stream GPT-4o answer with citations (SSE)
  → save turn to Redis + Postgres
  → log run to MLflow (background)
  → auto-eval faithfulness with GPT-4o-mini (background)
```

---

## Tech stack

| Layer | Technology |
|---|---|
| LLM | GPT-4o (answers) + GPT-4o-mini (eval) |
| Embeddings | OpenAI text-embedding-3-small |
| Voice | OpenAI Whisper API |
| Agent | LangGraph |
| Vector DB | Qdrant |
| Relational DB | PostgreSQL (asyncpg) |
| Cache / sessions | Redis |
| Experiment tracking | MLflow |
| Backend | FastAPI + uvicorn |
| Frontend | React + Vite |
| Auth | JWT (python-jose + passlib/bcrypt) |
| PDF parsing | pypdf |
| Web scraping | Trafilatura |
| Reranking | Keyword overlap (Cohere optional) |
| Infra | Docker Compose |

---

## Project structure

```
research-agent/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + CORS + routers
│   │   ├── dependencies.py          # JWT auth dependency
│   │   ├── routers/
│   │   │   ├── health.py            # GET /health
│   │   │   ├── auth.py              # signup, login, me, history
│   │   │   ├── transcribe.py        # POST /api/transcribe (Whisper)
│   │   │   ├── ingest.py            # POST /api/ingest/pdf|url
│   │   │   ├── chat.py              # POST /api/chat (SSE streaming)
│   │   │   └── stats.py             # GET /api/stats (MLflow metrics)
│   │   └── services/
│   │       ├── auth.py              # JWT, password hashing, user DB
│   │       ├── whisper.py           # OpenAI Whisper wrapper
│   │       ├── pdf_parser.py        # pypdf text extraction
│   │       ├── scraper.py           # Trafilatura URL scraping
│   │       ├── chunker.py           # Recursive character splitter
│   │       ├── embedder.py          # OpenAI embeddings (batch + single)
│   │       ├── store.py             # Qdrant + Postgres (user-scoped)
│   │       ├── ingest.py            # Full ingestion pipeline
│   │       ├── reranker.py          # Keyword / Cohere reranker
│   │       ├── synthesizer.py       # GPT-4o streaming with history
│   │       ├── agent.py             # LangGraph orchestration
│   │       ├── memory.py            # Redis (fast) + Postgres (persistent)
│   │       ├── tracker.py           # MLflow run logging
│   │       └── evaluator.py        # GPT-4o-mini faithfulness scoring
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                 # React entry + AuthProvider
│   │   ├── App.jsx                  # Root layout + auth gate
│   │   ├── index.css                # Global design system
│   │   ├── api/
│   │   │   └── client.js            # API calls with Bearer token
│   │   ├── hooks/
│   │   │   ├── useAuth.jsx          # Auth context (login/signup/logout)
│   │   │   ├── useChat.js           # SSE streaming + history loading
│   │   │   ├── useVoiceRecorder.js  # MediaRecorder mic hook
│   │   │   └── useIngest.js         # Source indexing hook
│   │   ├── components/
│   │   │   ├── ChatInput.jsx        # Text + mic combined input
│   │   │   ├── ChatMessage.jsx      # Message bubbles + citation badges
│   │   │   ├── MicButton.jsx        # Animated mic button
│   │   │   ├── SourceUploader.jsx   # PDF/URL upload + index panel
│   │   │   ├── StatusBar.jsx        # Backend health indicator
│   │   │   └── StatsDashboard.jsx   # MLflow metrics panel
│   │   └── pages/
│   │       └── AuthPage.jsx         # Login / signup form
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Quick start

### 1. Clone and configure

```bash
git clone <your-repo>
cd research-agent
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
OPENAI_API_KEY=sk-your-key-here
QDRANT_URL=http://qdrant:6333
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/research
MLFLOW_TRACKING_URI=http://mlflow:5000
REDIS_URL=redis://redis:6379
JWT_SECRET_KEY=your-long-random-secret-min-32-chars
COHERE_API_KEY=          # optional — leave blank for keyword reranking
```

Generate a JWT secret:
```bash
openssl rand -hex 32
```

### 2. Start everything

```bash
docker compose up --build -d
```

First build takes 3–5 minutes. After that:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| MLflow dashboard | http://localhost:5001 |
| Qdrant dashboard | http://localhost:6333/dashboard |

### 3. Use the app

1. Open `http://localhost:5173`
2. Sign up with email + password
3. Drop a PDF or paste a URL in the left sidebar
4. Click **"Index N sources"** — wait for chunk count to appear
5. Ask a question by typing or clicking the mic
6. Get a streamed GPT-4o answer with `[1]` `[2]` citation badges
7. Click **MLflow** in the top bar to see query metrics

---

## API reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/history` | Load persisted chat history |
| DELETE | `/api/auth/history` | Clear chat history |

### Ingestion
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ingest/pdf` | Upload and index a PDF |
| POST | `/api/ingest/url` | Scrape and index a URL |
| GET | `/api/sources` | List user's indexed sources |
| DELETE | `/api/sources/{id}` | Delete a source |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Stream answer (SSE) |
| DELETE | `/api/chat/{session_id}` | Clear session memory |

### Other
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transcribe` | Transcribe audio via Whisper |
| GET | `/api/stats` | MLflow aggregated metrics |
| GET | `/health` | Health check |

All endpoints except `/health`, `/api/auth/signup`, and `/api/auth/login` require:
```
Authorization: Bearer <token>
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `JWT_SECRET_KEY` | Yes | Min 32-char random string for JWT signing |
| `QDRANT_URL` | Yes | Qdrant connection URL |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection URL |
| `MLFLOW_TRACKING_URI` | Yes | MLflow server URL |
| `COHERE_API_KEY` | No | Enables neural reranking (keyword fallback if blank) |

---

## Development commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a single service after code change
docker compose restart backend

# Full rebuild (after requirements.txt change)
docker compose up --build -d

# Stop everything
docker compose down

# Stop and wipe all data (fresh start)
docker compose down -v
```

---

## What each phase built

| Phase | Features added |
|---|---|
| 1 | FastAPI backend, React UI, mic recording, Whisper transcription |
| 2 | PDF/URL ingestion → chunking → embeddings → Qdrant + Postgres |
| 3 | LangGraph agent, GPT-4o streaming, inline citation badges |
| 4 | MLflow tracking — latency, cost, tokens, auto faithfulness eval |
| 5 | Reranking (top-20 → top-5), Redis session memory, clear chat |
| 6 | JWT auth, user isolation, persistent chat history in Postgres |

---

## Known limitations

- PDF parsing works best on text-based PDFs — scanned/image PDFs return no text
- Whisper transcription requires browser mic permission
- MLflow faithfulness eval adds ~1-2s latency after response (runs in background)
- Cohere reranking requires a paid Cohere API key — keyword fallback is used by default



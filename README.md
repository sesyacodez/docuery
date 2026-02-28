# Docuery (Monorepo)

Docuery is a simple RAG app for working with PDF documents.

- Frontend: Next.js (React + TypeScript)
- Backend: FastAPI + LangChain + Chroma
- Features: upload PDFs, ask questions, get cited answers


https://github.com/user-attachments/assets/25f56b2f-0520-4276-b276-f645b8aa9253


## Repository layout

```text
Docuery/
├─ backend/            # FastAPI RAG API
│  ├─ app/
│  ├─ requirements.txt
│  └─ .env.example
├─ docuery/            # Next.js frontend
│  ├─ app/
│  ├─ package.json
│  └─ .env.local (optional)
└─ README.md
```

## Prerequisites

- Node.js 20+
- Python 3.11 or 3.12
- An API key (OpenAI-compatible; OpenAI or OpenRouter)

## Local development

### 1) Start backend

From the repo root:

```bash
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Set at least `OPENAI_API_KEY` in `backend/.env`, then run:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend base URL: `http://localhost:8000/api`

### 2) Start frontend

In a second terminal from repo root:

```bash
cd docuery
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

By default, frontend API base is `http://localhost:8000/api`.
You can override it with `docuery/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## Environment variables

### Backend (`backend/.env`)

Available keys (from `.env.example`):

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_SITE_URL=
OPENAI_APP_NAME=Docuery
CORS_ORIGINS=["http://localhost:3000"]
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K=4
```

### OpenRouter example

```bash
OPENAI_API_KEY=your_openrouter_key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_CHAT_MODEL=openai/gpt-oss-20b
OPENAI_SITE_URL=http://localhost:3000
OPENAI_APP_NAME=Docuery
```

Notes:
- Keep `OPENAI_EMBEDDING_MODEL` set to an embedding-capable model.
- Your provider key must have quota for both embeddings and chat, or upload/chat can return `429`.

## API routes

All routes are under `/api`:

- `GET /health`
- `POST /documents/upload`
- `DELETE /documents/{document_id}`
- `DELETE /documents`
- `POST /chat`

## Deployment

### Frontend (Vercel)

Deploy `docuery/` to Vercel.

Set frontend environment variable:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<your-backend-domain>/api
```

### Backend (Railway / Render / Fly.io)

Deploy `backend/` as a Python web service.

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set backend env vars from `backend/.env.example`.

### Important persistence note

The backend uses local Chroma persistence under `backend/storage/chroma` and uploaded files under `backend/storage/uploads`.

Use persistent storage/volume on your backend host. Do not rely on ephemeral filesystem if you need data to survive restarts.

## Git / ignore rules

Do not commit:

- `.env` files
- virtual environments
- `node_modules`
- Chroma DB files and uploads in `backend/storage/`

This repository includes `.gitignore` rules for these artifacts.

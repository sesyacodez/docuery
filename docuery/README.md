# Docuery MVP (Frontend)

This is the Next.js frontend for a simple RAG MVP:
- Upload PDF files
- Ask questions about uploaded files
- Get responses from a FastAPI + LangChain + Chroma backend

## Prerequisites

- Node.js 20+
- Python 3.11 or 3.12
- OpenAI key or OpenRouter key

## 1) Run backend

From the workspace root:

```bash
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Set `OPENAI_API_KEY` in `backend/.env`, then run:

```bash
uvicorn app.main:app --reload --port 8000
```

### OpenRouter example (gpt-oss-20b)

If using an OpenRouter key, set these values in `backend/.env`:

```bash
OPENAI_API_KEY=your_openrouter_key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_CHAT_MODEL=openai/gpt-oss-20b
OPENAI_SITE_URL=http://localhost:3000
OPENAI_APP_NAME=Docuery
```

Notes:
- Keep `OPENAI_EMBEDDING_MODEL` set to an embedding-capable model.
- Your provider key must have quota for both embeddings and chat, or upload/chat will return `429`.

## 2) Run frontend

In another terminal:

```bash
cd docuery
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:8000`.

## Optional frontend env

If your backend URL is different, create `docuery/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

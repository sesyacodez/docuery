from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title="Docuery RAG Backend", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api", tags=["health"])
    app.include_router(documents_router, prefix="/api", tags=["documents"])
    app.include_router(chat_router, prefix="/api", tags=["chat"])

    return app


app = create_app()

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

from app.core.config import settings

_vector_store: Chroma | None = None


def get_vector_store() -> Chroma:
    global _vector_store

    if _vector_store is None:
        settings.chroma_dir.mkdir(parents=True, exist_ok=True)

        embeddings = OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_embedding_model,
            default_headers=settings.provider_headers,
        )

        _vector_store = Chroma(
            collection_name=settings.chroma_collection_name,
            embedding_function=embeddings,
            persist_directory=str(settings.chroma_dir),
        )

    return _vector_store

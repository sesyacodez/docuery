from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Docuery RAG Backend"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    openai_api_key: str = ""
    openai_base_url: str | None = None
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_site_url: str | None = None
    openai_app_name: str = "Docuery"

    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 4

    storage_dir: Path = Path("storage")
    uploads_subdir: str = "uploads"
    chroma_subdir: str = "chroma"
    registry_file: str = "documents.json"
    chroma_collection_name: str = "docuery"

    @property
    def uploads_dir(self) -> Path:
        return self.storage_dir / self.uploads_subdir

    @property
    def chroma_dir(self) -> Path:
        return self.storage_dir / self.chroma_subdir

    @property
    def documents_registry_path(self) -> Path:
        return self.storage_dir / self.registry_file

    @property
    def provider_headers(self) -> dict[str, str] | None:
        base_url = (self.openai_base_url or "").lower()
        if "openrouter.ai" not in base_url:
            return None

        headers = {
            "X-Title": self.openai_app_name,
        }

        if self.openai_site_url:
            headers["HTTP-Referer"] = self.openai_site_url

        return headers


settings = Settings()

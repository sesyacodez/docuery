import json
from datetime import datetime, timezone

from app.core.config import settings
from app.schemas.documents import DocumentMetadata


def _ensure_registry_file() -> None:
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    if not settings.documents_registry_path.exists():
        settings.documents_registry_path.write_text("[]", encoding="utf-8")


def list_documents() -> list[DocumentMetadata]:
    _ensure_registry_file()
    raw = settings.documents_registry_path.read_text(encoding="utf-8")
    data = json.loads(raw)
    return [DocumentMetadata.model_validate(item) for item in data]


def upsert_document(document: DocumentMetadata) -> None:
    documents = list_documents()
    by_id = {item.document_id: item for item in documents}
    by_id[document.document_id] = document
    _write_documents(list(by_id.values()))


def remove_document(document_id: str) -> DocumentMetadata | None:
    documents = list_documents()
    kept: list[DocumentMetadata] = []
    removed: DocumentMetadata | None = None

    for item in documents:
        if item.document_id == document_id:
            removed = item
        else:
            kept.append(item)

    _write_documents(kept)
    return removed


def clear_documents() -> int:
    documents = list_documents()
    _write_documents([])
    return len(documents)


def _write_documents(documents: list[DocumentMetadata]) -> None:
    payload = [item.model_dump(mode="json") for item in documents]
    settings.documents_registry_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)

from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from openai import RateLimitError

from app.core.config import settings
from app.db.chroma import get_vector_store
from app.schemas.documents import DocumentMetadata
from app.services import registry


def ingest_upload(file: UploadFile) -> DocumentMetadata:
    if not settings.openai_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="OPENAI_API_KEY is not configured. Set it in backend/.env before uploading documents.",
        )

    filename = file.filename or "uploaded.pdf"

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Only PDF files are supported. Received: {filename}")

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    document_id = str(uuid4())
    stored_filename = f"{document_id}.pdf"
    destination = settings.uploads_dir / stored_filename

    content = file.file.read()
    destination.write_bytes(content)

    metadata = DocumentMetadata(
        document_id=document_id,
        filename=filename,
        stored_filename=stored_filename,
        bytes_size=len(content),
        uploaded_at=registry.utc_now(),
    )

    _index_pdf(metadata, destination)
    registry.upsert_document(metadata)
    return metadata


def delete_document(document_id: str) -> bool:
    removed = registry.remove_document(document_id)
    if removed is None:
        return False

    _delete_vectors_for_document(document_id)
    file_path = settings.uploads_dir / removed.stored_filename
    if file_path.exists():
        file_path.unlink()

    return True


def clear_documents() -> int:
    documents = registry.list_documents()
    for item in documents:
        _delete_vectors_for_document(item.document_id)
        file_path = settings.uploads_dir / item.stored_filename
        if file_path.exists():
            file_path.unlink()

    deleted_count = registry.clear_documents()
    return deleted_count


def _index_pdf(doc: DocumentMetadata, path: Path) -> None:
    loader = PyPDFLoader(str(path))
    pages = loader.load()

    if not pages:
        raise HTTPException(status_code=400, detail=f"Could not extract text from PDF: {doc.filename}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    chunks = splitter.split_documents(pages)

    for chunk in chunks:
        chunk.metadata["document_id"] = doc.document_id
        chunk.metadata["filename"] = doc.filename

    store = get_vector_store()
    try:
        store.add_documents(chunks)
    except RateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail="Provider quota exceeded. Check your billing/quota and try again.",
        ) from error


def _delete_vectors_for_document(document_id: str) -> None:
    store = get_vector_store()
    collection = store._collection
    result = collection.get(where={"document_id": document_id}, include=[])
    ids = result.get("ids", [])

    if ids:
        store.delete(ids=ids)

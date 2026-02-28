from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.documents import (
    ClearDocumentsResponse,
    DeleteDocumentResponse,
    ListDocumentsResponse,
    UploadDocumentsResponse,
)
from app.services import registry
from app.services.ingest import clear_documents, delete_document, ingest_upload

router = APIRouter()


@router.post("/documents/upload", response_model=UploadDocumentsResponse)
def upload_documents(files: list[UploadFile] = File(...)) -> UploadDocumentsResponse:
    if not files:
        raise HTTPException(status_code=400, detail="No files received")

    uploaded = [ingest_upload(file) for file in files]
    return UploadDocumentsResponse(documents=uploaded)


@router.get("/documents", response_model=ListDocumentsResponse)
def list_uploaded_documents() -> ListDocumentsResponse:
    return ListDocumentsResponse(documents=registry.list_documents())


@router.delete("/documents/{document_id}", response_model=DeleteDocumentResponse)
def remove_document(document_id: str) -> DeleteDocumentResponse:
    removed = delete_document(document_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Document not found")
    return DeleteDocumentResponse(deleted_document_id=document_id)


@router.delete("/documents", response_model=ClearDocumentsResponse)
def remove_all_documents() -> ClearDocumentsResponse:
    deleted_count = clear_documents()
    return ClearDocumentsResponse(deleted_count=deleted_count)

from datetime import datetime

from pydantic import BaseModel


class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    stored_filename: str
    bytes_size: int
    uploaded_at: datetime


class UploadDocumentsResponse(BaseModel):
    documents: list[DocumentMetadata]


class ListDocumentsResponse(BaseModel):
    documents: list[DocumentMetadata]


class DeleteDocumentResponse(BaseModel):
    deleted_document_id: str


class ClearDocumentsResponse(BaseModel):
    deleted_count: int

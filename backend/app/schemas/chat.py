from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    document_ids: list[str] | None = None
    history: list[ChatHistoryItem] | None = None


class ChatCitation(BaseModel):
    document_id: str
    filename: str
    page: int | None = None
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[ChatCitation]
    used_document_ids: list[str]

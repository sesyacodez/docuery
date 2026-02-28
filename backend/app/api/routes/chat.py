from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag import answer_question

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    return answer_question(
        message=request.message,
        document_ids=request.document_ids,
        history=request.history,
    )

from fastapi import HTTPException
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from openai import RateLimitError
import re
from difflib import SequenceMatcher

from app.core.config import settings
from app.db.chroma import get_vector_store
from app.schemas.chat import ChatCitation, ChatHistoryItem, ChatResponse


def _extract_spelling_hints(context: str) -> list[str]:
    pattern = re.compile(r"\b[A-Z][a-zA-Z'-]{1,}(?:\s+\([A-Z][a-zA-Z'-]{1,}\))?(?:\s+[A-Z][a-zA-Z'-]{1,})+\b")
    seen: set[str] = set()
    hints: list[str] = []

    for match in pattern.finditer(context):
        value = re.sub(r"\s+", " ", match.group(0)).strip()
        if len(value) < 4:
            continue
        if value in seen:
            continue
        seen.add(value)
        hints.append(value)
        if len(hints) >= 20:
            break

    return hints


def _name_variants(value: str) -> list[str]:
    variants = [value]
    without_parentheses = re.sub(r"\([^)]*\)", "", value)
    without_parentheses = re.sub(r"\s+", " ", without_parentheses).strip()
    if without_parentheses and without_parentheses not in variants:
        variants.append(without_parentheses)
    return variants


def _normalize_for_match(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _correct_answer_spelling(answer: str, spelling_hints: list[str]) -> str:
    candidates: list[tuple[str, str]] = []
    for hint in spelling_hints:
        for variant in _name_variants(hint):
            normalized = _normalize_for_match(variant)
            if len(normalized) >= 8:
                candidates.append((variant, normalized))

    if not candidates:
        return answer

    pattern = re.compile(r"\b[A-Z][a-zA-Z'-]{1,}(?:\s+[A-Z][a-zA-Z'-]{1,}){1,4}\b")

    def replace_match(match: re.Match[str]) -> str:
        span = match.group(0)
        normalized_span = _normalize_for_match(span)
        if len(normalized_span) < 8:
            return span

        best_variant = span
        best_score = 0.0
        for variant, normalized_variant in candidates:
            score = SequenceMatcher(None, normalized_span, normalized_variant).ratio()
            if score > best_score:
                best_score = score
                best_variant = variant

        return best_variant if best_score >= 0.86 else span

    return pattern.sub(replace_match, answer)


def answer_question(
    message: str,
    document_ids: list[str] | None = None,
    history: list[ChatHistoryItem] | None = None,
) -> ChatResponse:
    if not settings.openai_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="OPENAI_API_KEY is not configured. Set it in backend/.env before using chat.",
        )

    if not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    store = get_vector_store()
    search_kwargs: dict = {"k": settings.top_k}
    if document_ids:
        search_kwargs["filter"] = {"document_id": {"$in": document_ids}}

    try:
        docs = store.similarity_search(message, **search_kwargs)
    except RateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail="Provider quota exceeded. Check your billing/quota and try again.",
        ) from error

    if not docs:
        return ChatResponse(
            answer="I could not find relevant context in the uploaded documents. Try rephrasing your question.",
            citations=[],
            used_document_ids=[],
        )

    context = "\n\n".join([doc.page_content for doc in docs])
    spelling_hints = _extract_spelling_hints(context)
    spelling_hint_block = "\n".join([f"- {item}" for item in spelling_hints]) if spelling_hints else "- (none extracted)"

    llm = ChatOpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        model=settings.openai_chat_model,
        temperature=0,
        default_headers=settings.provider_headers,
    )
    prompt_messages: list[BaseMessage] = [
        SystemMessage(
            content=(
                "You answer questions only using provided document context. "
                "If the answer is not in context, clearly say you do not know. "
                "For names, organizations, titles, IDs, and dates, copy exact spelling from context. "
                "Do not transliterate, normalize, or correct spelling."
            )
        )
    ]

    if history:
        for item in history[-8:]:
            role = item.role.lower()
            if role != "assistant":
                prompt_messages.append(HumanMessage(content=item.text))

    prompt_messages.append(
        HumanMessage(
            content=(
                "Document context:\n"
                f"{context}\n\n"
                "Exact spellings extracted from the context (reuse verbatim if referenced):\n"
                f"{spelling_hint_block}\n\n"
                "Question:\n"
                f"{message}"
            )
        )
    )

    try:
        response = llm.invoke(prompt_messages)
    except RateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail="Provider quota exceeded. Check your billing/quota and try again.",
        ) from error
    answer = response.content if isinstance(response.content, str) else str(response.content)
    answer = _correct_answer_spelling(answer, spelling_hints)

    citations: list[ChatCitation] = []
    used_document_ids: set[str] = set()
    for doc in docs:
        doc_id = str(doc.metadata.get("document_id", ""))
        filename = str(doc.metadata.get("filename", "Document"))
        page_value = doc.metadata.get("page")
        page = int(page_value) + 1 if isinstance(page_value, int) else None

        if doc_id:
            used_document_ids.add(doc_id)

        citations.append(
            ChatCitation(
                document_id=doc_id,
                filename=filename,
                page=page,
                snippet=doc.page_content[:220],
            )
        )

    return ChatResponse(
        answer=answer,
        citations=citations,
        used_document_ids=sorted(used_document_ids),
    )

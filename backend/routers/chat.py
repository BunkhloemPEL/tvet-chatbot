from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from crud import (
    get_session,
    save_message,
    get_history,
    create_chat_session,
    get_user_sessions,
    get_session_by_id,
)
from services.rag_service import build_chain
from services.deps import get_current_user
from database import User

router = APIRouter(prefix="/chat", tags=["chat"])
chain = build_chain()


class ChatRequest(BaseModel):
    session_id: str | None = None  # None = create new session
    message: str


@router.post("/session")
def new_session(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    session = create_chat_session(db, user_id=current_user.id)
    return {
        "session_id": session.id,
        "title": session.title,
        "created_at": session.created_at,
    }


@router.get("/sessions")
def list_sessions(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    sessions = get_user_sessions(db, user_id=current_user.id)
    return [
        {
            "session_id": s.id,
            "title": s.title,
            "created_at": s.created_at,
        }
        for s in sessions
    ]


# @router.post("/")
# async def chat(request: SessionRequest, db: Session = Depends(get_session)):
#     save_message(db, request.session_id, "user", request.message)

#     history = get_history(db, request.session_id)[:-1]

#     def generate():
#         full_response = ""
#         for chunk in chain.stream(
#             {
#                 "question": request.message,
#                 "history": history,
#             }
#         ):
#             full_response += chunk
#             yield f"data: {chunk}\n\n"
#         save_message(db, request.session_id, "assistant", full_response)

#     return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/no-stream")
async def chat_no_stream(
    request: ChatRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Create new session if none provided
    if not request.session_id:
        session = create_chat_session(db, user_id=current_user.id)
        session_id = session.id
    else:
        # Verify session belongs to this user
        session = get_session_by_id(db, request.session_id, current_user.id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )
        session_id = request.session_id

    save_message(db, session_id, "user", request.message)
    history = get_history(db, session_id)[:-1]

    full_response = chain.invoke(
        {
            "question": request.message,
            "history": history,
        }
    )

    save_message(db, request.session_id, "assistant", full_response)

    return {"response": full_response}

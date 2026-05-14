from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel  # ← add back
from sqlalchemy.orm import Session
from crud import get_session, save_message, get_history
from services.rag_service import build_chain

router = APIRouter(prefix="/chat", tags=["chat"])
chain = build_chain()


class SessionRequest(BaseModel):  # ← define it here directly
    session_id: str
    message: str


@router.post("/")
async def chat(request: SessionRequest, db: Session = Depends(get_session)):
    save_message(db, request.session_id, "user", request.message)

    history = get_history(db, request.session_id)[:-1]

    def generate():
        full_response = ""
        for chunk in chain.stream(
            {
                "question": request.message,
                "history": history,
            }
        ):
            full_response += chunk
            yield f"data: {chunk}\n\n"
        save_message(db, request.session_id, "assistant", full_response)

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/no-stream")
async def chat_no_stream(request: SessionRequest, db: Session = Depends(get_session)):
    save_message(db, request.session_id, "user", request.message)

    history = get_history(db, request.session_id)[:-1]

    full_response = chain.invoke(
        {
            "question": request.message,
            "history": history,
        }
    )

    save_message(db, request.session_id, "assistant", full_response)

    return {"response": full_response}

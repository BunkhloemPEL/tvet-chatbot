from sqlalchemy.orm import Session
from database import Conversation, SessionLocal


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def save_message(db: Session, session_id: str, role: str, content: str):
    message = Conversation(session_id=session_id, role=role, content=content)
    db.add(message)
    db.commit()


def get_history(db: Session, session_id: str) -> list:
    messages = (
        db.query(Conversation)
        .filter(Conversation.session_id == session_id)
        .order_by(Conversation.created_at)
        .all()
    )

    return [{"role": m.role, "content": m.content} for m in messages]

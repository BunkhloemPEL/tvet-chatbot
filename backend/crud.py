from sqlalchemy.orm import Session
from datetime import datetime

from database import Conversation, ConversationState, SessionLocal, User, ChatSession
import uuid


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── User operations ──────────────────────────────────────


def create_user(db: Session, phone: str, username: str, hashed_password: str) -> User:
    user = User(phone=phone, username=username, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_phone(db: Session, phone: str) -> User:
    return db.query(User).filter(User.phone == phone).first()


def get_user_by_id(db: Session, user_id: int) -> User:
    return db.query(User).filter(User.id == user_id).first()


# ── Session operations ───────────────────────────────────


def create_chat_session(
    db: Session, user_id: int, title: str = "New Conversation"
) -> ChatSession:
    session = ChatSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=title,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_user_sessions(db: Session, user_id: int) -> list:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


def get_session_by_id(db: Session, session_id: str, user_id: int) -> ChatSession:
    return (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id)
        .filter(ChatSession.user_id == user_id)
        .first()
    )


def update_chat_session_title(
    db: Session, session: ChatSession, title: str
) -> ChatSession:
    session.title = title
    db.commit()
    db.refresh(session)
    return session


def delete_chat_session(db: Session, session: ChatSession) -> None:
    db.query(ConversationState).filter(
        ConversationState.session_id == session.id
    ).delete(synchronize_session=False)
    db.query(Conversation).filter(
        Conversation.session_id == session.id
    ).delete(synchronize_session=False)
    db.delete(session)
    db.commit()


# ── Message operations ───────────────────────────────────


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


def get_conversation_state(db: Session, session_id: str) -> ConversationState:
    return (
        db.query(ConversationState)
        .filter(ConversationState.session_id == session_id)
        .first()
    )


def upsert_conversation_state(
    db: Session, session_id: str, state_json: str
) -> ConversationState:
    state = get_conversation_state(db, session_id)
    if state:
        state.state_json = state_json
        state.updated_at = datetime.now()
    else:
        state = ConversationState(session_id=session_id, state_json=state_json)
        db.add(state)

    db.commit()
    db.refresh(state)
    return state

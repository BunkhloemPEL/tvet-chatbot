from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from crud import get_session, create_user, get_user_by_phone
from services.auth_service import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    phone: str
    username: str
    password: str


class LoginRequest(BaseModel):
    phone: str
    password: str


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_session)):
    # Check if phone already exists
    existing = get_user_by_phone(db, request.phone)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered",
        )

    # Create user
    user = create_user(
        db=db,
        phone=request.phone,
        username=request.username,
        hashed_password=hash_password(request.password),
    )

    return {
        "message": "Registration successful",
        "user_id": user.id,
        "username": user.username,
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_session)):
    # Find user
    user = get_user_by_phone(db, request.phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password"
        )

    # Verify password
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password"
        )

    # Create JWT token
    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "user_id": user.id,
    }

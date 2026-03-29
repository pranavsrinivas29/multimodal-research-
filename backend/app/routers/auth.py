import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.services.auth import (
    create_user, get_user_by_email,
    verify_password, create_token
)
from app.services.memory import load_history_from_db, clear_history_from_db
from app.dependencies import get_current_user

router = APIRouter()

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    user_id: str

@router.post("/auth/signup", response_model=TokenResponse)
async def signup(body: SignupRequest):
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    existing = await get_user_by_email(body.email)
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    await create_user(user_id, body.email, body.password)
    token = create_token(user_id, body.email)
    return TokenResponse(access_token=token, email=body.email, user_id=user_id)

@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = await get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["user_id"], user["email"])
    return TokenResponse(access_token=token, email=user["email"], user_id=user["user_id"])

@router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.get("/auth/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    """Load persisted chat history for the logged-in user."""
    messages = await load_history_from_db(current_user["user_id"])
    return {"messages": messages}

@router.delete("/auth/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    await clear_history_from_db(current_user["user_id"])
    return {"cleared": True}
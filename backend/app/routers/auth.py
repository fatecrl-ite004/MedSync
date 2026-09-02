from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import ProfessionalProfile, Specialty, User, UserRole
from app.schemas import LoginRequest, LoginResponse, RegisterRequest, UserRead
from app.security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


def _normalized_email(email: str) -> str:
    return email.strip().lower()


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    if payload.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be created through public registration",
        )
    email = _normalized_email(str(payload.email))
    if db.scalar(select(User.id).where(func.lower(User.email) == email)) is not None:
        raise HTTPException(status_code=409, detail="Email is already registered")

    specialty: Specialty | None = None
    if payload.role == UserRole.PROFESSIONAL:
        if payload.specialty_id is None:
            raise HTTPException(
                status_code=422,
                detail="specialty_id is required for professional registration",
            )
        specialty = db.get(Specialty, payload.specialty_id)
        if specialty is None or not specialty.is_active:
            raise HTTPException(status_code=404, detail="Specialty not found")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        preferred_period=payload.preferred_period,
    )
    db.add(user)
    try:
        db.flush()
        if payload.role == UserRole.PROFESSIONAL and specialty is not None:
            db.add(
                ProfessionalProfile(
                    user_id=user.id,
                    specialty_id=specialty.id,
                    crm=payload.crm.strip() if payload.crm else None,
                    bio=payload.bio.strip() if payload.bio else None,
                )
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Email or professional registry is already in use"
        ) from None
    db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    email = _normalized_email(str(payload.email))
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None or not user.is_active or not verify_password(
        payload.password, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return LoginResponse(
        access_token=create_access_token(user.id),
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

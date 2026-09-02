from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import Specialty, User, UserRole
from app.schemas import SpecialtyCreate, SpecialtyRead


router = APIRouter(prefix="/specialties", tags=["specialties"])


@router.get("", response_model=list[SpecialtyRead])
def list_specialties(db: Session = Depends(get_db)) -> list[Specialty]:
    return list(
        db.scalars(
            select(Specialty)
            .where(Specialty.is_active.is_(True))
            .order_by(Specialty.name)
        )
    )


@router.post("", response_model=SpecialtyRead, status_code=status.HTTP_201_CREATED)
def create_specialty(
    payload: SpecialtyCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> Specialty:
    name = payload.name.strip()
    existing = db.scalar(
        select(Specialty).where(func.lower(Specialty.name) == name.lower())
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Specialty already exists")
    specialty = Specialty(
        name=name,
        description=payload.description.strip() if payload.description else None,
    )
    db.add(specialty)
    db.commit()
    db.refresh(specialty)
    return specialty

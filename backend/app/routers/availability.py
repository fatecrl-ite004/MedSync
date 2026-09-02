from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import AvailabilityRule, ProfessionalProfile, User, UserRole
from app.schemas import AvailabilityCreate, AvailabilityRead, MessageResponse
from app.scheduling import get_professional_or_404


router = APIRouter(prefix="/availability", tags=["availability"])


def _target_profile(
    db: Session, current_user: User, professional_id: int | None
) -> ProfessionalProfile:
    if current_user.role == UserRole.PROFESSIONAL:
        profile = current_user.professional_profile
        if profile is None:
            raise HTTPException(status_code=404, detail="Professional profile not found")
        if professional_id is not None and professional_id != profile.id:
            raise HTTPException(status_code=403, detail="You can only manage your own availability")
        return profile
    if professional_id is None:
        raise HTTPException(
            status_code=422, detail="professional_id is required for admin operations"
        )
    return get_professional_or_404(db, professional_id)


@router.get("", response_model=list[AvailabilityRead])
def list_availability(
    professional_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.PROFESSIONAL, UserRole.ADMIN)
    ),
) -> list[AvailabilityRule]:
    profile = _target_profile(db, current_user, professional_id)
    return list(
        db.scalars(
            select(AvailabilityRule)
            .where(AvailabilityRule.professional_id == profile.id)
            .order_by(AvailabilityRule.weekday, AvailabilityRule.start_time)
        )
    )


@router.post("", response_model=AvailabilityRead, status_code=status.HTTP_201_CREATED)
def create_availability(
    payload: AvailabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.PROFESSIONAL, UserRole.ADMIN)
    ),
) -> AvailabilityRule:
    profile = _target_profile(db, current_user, payload.professional_id)
    overlap = db.scalar(
        select(AvailabilityRule.id).where(
            AvailabilityRule.professional_id == profile.id,
            AvailabilityRule.weekday == payload.weekday,
            AvailabilityRule.start_time < payload.end_time,
            AvailabilityRule.end_time > payload.start_time,
        ).limit(1)
    )
    if overlap is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Availability overlaps an existing rule",
        )
    rule = AvailabilityRule(
        professional_id=profile.id,
        weekday=payload.weekday,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(rule)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Availability rule already exists") from None
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}", response_model=MessageResponse)
def delete_availability(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.PROFESSIONAL, UserRole.ADMIN)
    ),
) -> MessageResponse:
    rule = db.get(AvailabilityRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Availability rule not found")
    _target_profile(db, current_user, rule.professional_id)
    db.delete(rule)
    db.commit()
    return MessageResponse(message="Availability rule deleted")

from __future__ import annotations

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import (
    Appointment,
    AppointmentStatus,
    AvailabilityRule,
    ProfessionalProfile,
    Specialty,
    User,
    UserRole,
)
from app.schemas import ProfessionalCreate, ProfessionalRead, SlotRead, SlotsResponse
from app.scheduling import (
    SLOT_DURATION,
    get_professional_or_404,
    local_now,
    score_slot,
)
from app.security import hash_password


router = APIRouter(prefix="/professionals", tags=["professionals"])


def _professional_query():
    return select(ProfessionalProfile).options(
        joinedload(ProfessionalProfile.user),
        joinedload(ProfessionalProfile.specialty),
    )


@router.get("", response_model=list[ProfessionalRead])
def list_professionals(
    specialty_id: int | None = None, db: Session = Depends(get_db)
) -> list[ProfessionalProfile]:
    statement = _professional_query().where(
        ProfessionalProfile.is_active.is_(True),
        User.is_active.is_(True),
    ).join(ProfessionalProfile.user)
    if specialty_id is not None:
        statement = statement.where(ProfessionalProfile.specialty_id == specialty_id)
    return list(db.scalars(statement.order_by(User.full_name)).unique())


@router.post("", response_model=ProfessionalRead, status_code=status.HTTP_201_CREATED)
def create_professional(
    payload: ProfessionalCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> ProfessionalProfile:
    email = str(payload.email).strip().lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)) is not None:
        raise HTTPException(status_code=409, detail="Email is already registered")
    specialty = db.get(Specialty, payload.specialty_id)
    if specialty is None or not specialty.is_active:
        raise HTTPException(status_code=404, detail="Specialty not found")
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=UserRole.PROFESSIONAL,
    )
    db.add(user)
    try:
        db.flush()
        profile = ProfessionalProfile(
            user_id=user.id,
            specialty_id=specialty.id,
            crm=payload.crm.strip() if payload.crm else None,
            bio=payload.bio.strip() if payload.bio else None,
        )
        db.add(profile)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Email or professional registry is already in use"
        ) from None
    return db.scalar(
        _professional_query().where(ProfessionalProfile.user_id == user.id)
    )


@router.get("/{professional_id}/slots", response_model=SlotsResponse)
def professional_slots(
    professional_id: int,
    date_: date | None = Query(default=None, alias="date"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    days: int = Query(default=1, ge=1, le=14),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SlotsResponse:
    professional = get_professional_or_404(db, professional_id)
    now = local_now()
    first_date = date_from or date_ or now.date()
    if date_to is not None:
        requested_days = (date_to - first_date).days + 1
        if requested_days < 1 or requested_days > 14:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The requested date range must contain between 1 and 14 days",
            )
        days = requested_days
    last_date = first_date + timedelta(days=days)
    range_start = datetime.combine(first_date, time.min)
    range_end = datetime.combine(last_date, time.min)

    rules = list(
        db.scalars(
            select(AvailabilityRule).where(
                AvailabilityRule.professional_id == professional.id
            )
        )
    )
    busy = list(
        db.scalars(
            select(Appointment).where(
                Appointment.professional_id == professional.id,
                Appointment.status != AppointmentStatus.CANCELLED,
                Appointment.starts_at < range_end,
                Appointment.ends_at > range_start,
            )
        )
    )
    patient_busy: list[Appointment] = []
    if current_user.role == UserRole.PATIENT:
        patient_busy = list(
            db.scalars(
                select(Appointment).where(
                    Appointment.patient_id == current_user.id,
                    Appointment.status != AppointmentStatus.CANCELLED,
                    Appointment.starts_at < range_end,
                    Appointment.ends_at > range_start,
                )
            )
        )

    generated: dict[datetime, SlotRead] = {}
    for offset in range(days):
        target_date = first_date + timedelta(days=offset)
        for rule in rules:
            if rule.weekday != target_date.weekday():
                continue
            cursor = datetime.combine(target_date, rule.start_time)
            rule_end = datetime.combine(target_date, rule.end_time)
            while cursor + SLOT_DURATION <= rule_end:
                slot_end = cursor + SLOT_DURATION
                occupied = any(
                    appointment.starts_at < slot_end and appointment.ends_at > cursor
                    for appointment in (*busy, *patient_busy)
                )
                if cursor > now and not occupied:
                    period, recommended, score, reason = score_slot(
                        cursor, current_user.preferred_period, first_date
                    )
                    generated[cursor] = SlotRead(
                        starts_at=cursor,
                        ends_at=slot_end,
                        period=period,
                        recommended=recommended,
                        score=score,
                        reason=reason,
                    )
                cursor = slot_end

    slots = sorted(generated.values(), key=lambda slot: (-slot.score, slot.starts_at))
    return SlotsResponse(professional_id=professional.id, slots=slots)


@router.get("/{professional_id}", response_model=ProfessionalRead)
def get_professional(
    professional_id: int, db: Session = Depends(get_db)
) -> ProfessionalProfile:
    professional = db.scalar(
        _professional_query().where(
            ProfessionalProfile.id == professional_id,
            ProfessionalProfile.is_active.is_(True),
        )
    )
    if professional is None or not professional.user.is_active:
        raise HTTPException(status_code=404, detail="Professional not found")
    return professional

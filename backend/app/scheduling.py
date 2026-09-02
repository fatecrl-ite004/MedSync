from __future__ import annotations

from datetime import date, datetime, timedelta
from threading import RLock
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Appointment,
    AppointmentStatus,
    AvailabilityRule,
    PreferredPeriod,
    ProfessionalProfile,
    User,
)


SLOT_DURATION = timedelta(minutes=30)
booking_lock = RLock()


def local_now() -> datetime:
    return datetime.now(ZoneInfo(settings.app_timezone)).replace(tzinfo=None)


def normalize_local_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        value = value.astimezone(ZoneInfo(settings.app_timezone)).replace(tzinfo=None)
    return value.replace(microsecond=0)


def period_for(value: datetime) -> PreferredPeriod:
    if value.hour < 12:
        return PreferredPeriod.MORNING
    if value.hour < 18:
        return PreferredPeriod.AFTERNOON
    return PreferredPeriod.EVENING


def get_professional_or_404(db: Session, professional_id: int) -> ProfessionalProfile:
    profile = db.get(ProfessionalProfile, professional_id)
    if profile is None or not profile.is_active or not profile.user.is_active:
        raise HTTPException(status_code=404, detail="Professional not found")
    return profile


def validate_slot(
    db: Session, professional: ProfessionalProfile, starts_at: datetime
) -> tuple[datetime, datetime]:
    starts_at = normalize_local_datetime(starts_at)
    if starts_at <= local_now():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Appointment must be scheduled in the future",
        )
    if starts_at.minute not in {0, 30} or starts_at.second:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Appointments must start on a 30-minute boundary",
        )
    ends_at = starts_at + SLOT_DURATION
    rules = db.scalars(
        select(AvailabilityRule).where(
            AvailabilityRule.professional_id == professional.id,
            AvailabilityRule.weekday == starts_at.weekday(),
        )
    ).all()
    within_rule = any(
        rule.start_time <= starts_at.time() and ends_at.time() <= rule.end_time
        for rule in rules
    )
    if not within_rule:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selected time is outside the professional's availability",
        )
    return starts_at, ends_at


def lock_booking_resources(
    db: Session, *, professional_id: int, patient_id: int
) -> None:
    # PostgreSQL locks serialize bookings for the same actors. SQLite ignores
    # FOR UPDATE, so booking_lock provides the equivalent for this process.
    db.execute(
        select(ProfessionalProfile.id)
        .where(ProfessionalProfile.id == professional_id)
        .with_for_update()
    )
    db.execute(select(User.id).where(User.id == patient_id).with_for_update())


def ensure_no_conflicts(
    db: Session,
    *,
    professional_id: int,
    patient_id: int,
    starts_at: datetime,
    ends_at: datetime,
    exclude_appointment_id: int | None = None,
) -> None:
    base = [
        Appointment.status != AppointmentStatus.CANCELLED,
        Appointment.starts_at < ends_at,
        Appointment.ends_at > starts_at,
    ]
    if exclude_appointment_id is not None:
        base.append(Appointment.id != exclude_appointment_id)

    professional_conflict = db.scalar(
        select(Appointment.id).where(
            *base, Appointment.professional_id == professional_id
        ).limit(1)
    )
    if professional_conflict is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The professional already has an appointment in this time range",
        )

    patient_conflict = db.scalar(
        select(Appointment.id).where(*base, Appointment.patient_id == patient_id).limit(1)
    )
    if patient_conflict is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The patient already has an appointment in this time range",
        )


def score_slot(
    starts_at: datetime, preferred_period: PreferredPeriod | None, reference: date
) -> tuple[PreferredPeriod, bool, int, str]:
    period = period_for(starts_at)
    preference_match = preferred_period == period
    proximity = max(0, 14 - (starts_at.date() - reference).days)
    score = 70 + proximity + (20 if preference_match else 0)
    period_labels = {
        PreferredPeriod.MORNING: "manhã",
        PreferredPeriod.AFTERNOON: "tarde",
        PreferredPeriod.EVENING: "noite",
    }
    if preference_match:
        reason = f"Combina com sua preferência por {period_labels[period]} e está próximo."
    else:
        reason = "Horário disponível ordenado pela proximidade da data."
    return period, preference_match, score, reason

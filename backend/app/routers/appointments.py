from __future__ import annotations

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    Appointment,
    AppointmentStatus,
    ProfessionalProfile,
    User,
    UserRole,
    utcnow,
)
from app.schemas import (
    AppointmentCancel,
    AppointmentCreate,
    AppointmentRead,
    AppointmentReschedule,
)
from app.scheduling import (
    booking_lock,
    ensure_no_conflicts,
    get_professional_or_404,
    local_now,
    lock_booking_resources,
    validate_slot,
)


router = APIRouter(prefix="/appointments", tags=["appointments"])


def _appointment_query():
    return select(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.professional).joinedload(ProfessionalProfile.user),
        joinedload(Appointment.specialty),
    )


def _load_appointment(db: Session, appointment_id: int) -> Appointment:
    appointment = db.scalar(
        _appointment_query().where(Appointment.id == appointment_id)
    )
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


def _can_manage(current_user: User, appointment: Appointment) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if current_user.role == UserRole.PATIENT:
        return appointment.patient_id == current_user.id
    profile = current_user.professional_profile
    return profile is not None and appointment.professional_id == profile.id


def _assert_can_manage(current_user: User, appointment: Appointment) -> None:
    if not _can_manage(current_user, appointment):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot manage this appointment",
        )


def _lock_and_refresh_appointment(db: Session, appointment: Appointment) -> None:
    """Serialize mutations of one appointment and discard stale ORM state."""
    db.execute(
        select(Appointment.id)
        .where(Appointment.id == appointment.id)
        .with_for_update()
    )
    db.refresh(appointment)


@router.get("", response_model=list[AppointmentRead])
def list_appointments(
    status_filter: AppointmentStatus | None = Query(default=None, alias="status"),
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Appointment]:
    statement = _appointment_query()
    if current_user.role == UserRole.PATIENT:
        statement = statement.where(Appointment.patient_id == current_user.id)
    elif current_user.role == UserRole.PROFESSIONAL:
        profile = current_user.professional_profile
        if profile is None:
            return []
        statement = statement.where(Appointment.professional_id == profile.id)
    if status_filter is not None:
        statement = statement.where(Appointment.status == status_filter)
    if start_date is not None:
        statement = statement.where(
            Appointment.starts_at >= datetime.combine(start_date, time.min)
        )
    if end_date is not None:
        statement = statement.where(
            Appointment.starts_at < datetime.combine(end_date + timedelta(days=1), time.min)
        )
    return list(db.scalars(statement.order_by(Appointment.starts_at)).unique())


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Appointment:
    if current_user.role == UserRole.PROFESSIONAL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professionals cannot create appointments for patients",
        )
    if current_user.role == UserRole.PATIENT:
        if payload.patient_id is not None and payload.patient_id != current_user.id:
            raise HTTPException(
                status_code=403, detail="You can only create your own appointments"
            )
        patient = current_user
    else:
        if payload.patient_id is None:
            raise HTTPException(
                status_code=422, detail="patient_id is required when an admin books"
            )
        patient = db.get(User, payload.patient_id)
        if patient is None or patient.role != UserRole.PATIENT or not patient.is_active:
            raise HTTPException(status_code=404, detail="Patient not found")

    professional = get_professional_or_404(db, payload.professional_id)
    with booking_lock:
        starts_at, ends_at = validate_slot(db, professional, payload.starts_at)
        lock_booking_resources(
            db, professional_id=professional.id, patient_id=patient.id
        )
        ensure_no_conflicts(
            db,
            professional_id=professional.id,
            patient_id=patient.id,
            starts_at=starts_at,
            ends_at=ends_at,
        )
        appointment = Appointment(
            patient_id=patient.id,
            professional_id=professional.id,
            specialty_id=professional.specialty_id,
            starts_at=starts_at,
            ends_at=ends_at,
            status=AppointmentStatus.SCHEDULED,
        )
        db.add(appointment)
        db.commit()
        appointment_id = appointment.id
    return _load_appointment(db, appointment_id)


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentRead)
def reschedule_appointment(
    appointment_id: int,
    payload: AppointmentReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Appointment:
    appointment = _load_appointment(db, appointment_id)
    _assert_can_manage(current_user, appointment)
    with booking_lock:
        _lock_and_refresh_appointment(db, appointment)
        if appointment.status == AppointmentStatus.CANCELLED:
            raise HTTPException(
                status_code=409,
                detail="Cancelled appointments cannot be rescheduled",
            )
        professional = get_professional_or_404(db, appointment.professional_id)
        starts_at, ends_at = validate_slot(db, professional, payload.starts_at)
        lock_booking_resources(
            db,
            professional_id=appointment.professional_id,
            patient_id=appointment.patient_id,
        )
        ensure_no_conflicts(
            db,
            professional_id=appointment.professional_id,
            patient_id=appointment.patient_id,
            starts_at=starts_at,
            ends_at=ends_at,
            exclude_appointment_id=appointment.id,
        )
        appointment.starts_at = starts_at
        appointment.ends_at = ends_at
        appointment.updated_at = utcnow()
        db.commit()
    return _load_appointment(db, appointment_id)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentRead)
@router.post(
    "/{appointment_id}/cancel",
    response_model=AppointmentRead,
    include_in_schema=False,
)
def cancel_appointment(
    appointment_id: int,
    payload: AppointmentCancel | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Appointment:
    appointment = _load_appointment(db, appointment_id)
    _assert_can_manage(current_user, appointment)
    with booking_lock:
        _lock_and_refresh_appointment(db, appointment)
        if appointment.status != AppointmentStatus.CANCELLED:
            appointment.status = AppointmentStatus.CANCELLED
            appointment.cancellation_reason = payload.reason if payload else None
            appointment.cancelled_at = utcnow()
            appointment.updated_at = utcnow()
            db.commit()
    return _load_appointment(db, appointment_id)

from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Appointment,
    AppointmentStatus,
    AvailabilityRule,
    PreferredPeriod,
    ProfessionalProfile,
    Specialty,
    User,
    UserRole,
    utcnow,
)
from app.security import hash_password


DEMO_PASSWORD = "demo123"


def _get_or_create_specialty(
    db: Session, name: str, description: str
) -> Specialty:
    specialty = db.scalar(select(Specialty).where(Specialty.name == name))
    if specialty is None:
        specialty = Specialty(name=name, description=description)
        db.add(specialty)
        db.flush()
    return specialty


def _get_or_create_user(
    db: Session,
    *,
    email: str,
    full_name: str,
    role: UserRole,
    preferred_period: PreferredPeriod | None = None,
) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(DEMO_PASSWORD),
            role=role,
            preferred_period=preferred_period,
        )
        db.add(user)
        db.flush()
    return user


def _get_or_create_professional(
    db: Session,
    *,
    user: User,
    specialty: Specialty,
    crm: str,
    bio: str,
) -> ProfessionalProfile:
    profile = db.scalar(
        select(ProfessionalProfile).where(ProfessionalProfile.user_id == user.id)
    )
    if profile is None:
        profile = ProfessionalProfile(
            user_id=user.id,
            specialty_id=specialty.id,
            crm=crm,
            bio=bio,
        )
        db.add(profile)
        db.flush()
    return profile


def _ensure_rules(
    db: Session,
    professional: ProfessionalProfile,
    weekdays: tuple[int, ...],
    intervals: tuple[tuple[time, time], ...],
) -> None:
    existing = {
        (rule.weekday, rule.start_time, rule.end_time)
        for rule in db.scalars(
            select(AvailabilityRule).where(
                AvailabilityRule.professional_id == professional.id
            )
        )
    }
    for weekday in weekdays:
        for start_time, end_time in intervals:
            key = (weekday, start_time, end_time)
            if key not in existing:
                db.add(
                    AvailabilityRule(
                        professional_id=professional.id,
                        weekday=weekday,
                        start_time=start_time,
                        end_time=end_time,
                    )
                )


def _next_business_day(today: date) -> date:
    candidate = today + timedelta(days=1)
    while candidate.weekday() > 4:
        candidate += timedelta(days=1)
    return candidate


def _ensure_demo_appointment(
    db: Session,
    *,
    seed_key: str,
    patient: User,
    professional: ProfessionalProfile,
    starts_at: datetime,
    status: AppointmentStatus,
    reason: str | None = None,
) -> None:
    appointment = db.scalar(
        select(Appointment).where(Appointment.seed_key == seed_key)
    )
    if appointment is None:
        db.add(
            Appointment(
                patient_id=patient.id,
                professional_id=professional.id,
                specialty_id=professional.specialty_id,
                starts_at=starts_at,
                ends_at=starts_at + timedelta(minutes=30),
                status=status,
                cancellation_reason=reason,
                cancelled_at=utcnow()
                if status == AppointmentStatus.CANCELLED
                else None,
                seed_key=seed_key,
            )
        )
    elif appointment.starts_at < datetime.now() and appointment.status == status:
        appointment.starts_at = starts_at
        appointment.ends_at = starts_at + timedelta(minutes=30)


def seed_database(db: Session) -> None:
    specialties = {
        "general": _get_or_create_specialty(
            db, "Clínica Geral", "Acompanhamento clínico e cuidados gerais."
        ),
        "cardiology": _get_or_create_specialty(
            db, "Cardiologia", "Cuidados relacionados à saúde cardiovascular."
        ),
        "dermatology": _get_or_create_specialty(
            db, "Dermatologia", "Cuidados com pele, cabelos e unhas."
        ),
        "pediatrics": _get_or_create_specialty(
            db, "Pediatria", "Acompanhamento de crianças e adolescentes."
        ),
    }

    _get_or_create_user(
        db,
        email="admin@medsync.test",
        full_name="Carla Mendes",
        role=UserRole.ADMIN,
    )
    patient = _get_or_create_user(
        db,
        email="paciente@medsync.test",
        full_name="João Martins",
        role=UserRole.PATIENT,
        preferred_period=PreferredPeriod.MORNING,
    )

    professional_specs = (
        (
            "medico@medsync.test",
            "Dra. Ana Souza",
            "general",
            "CRM-DEMO-001",
            "Atendimento acolhedor em clínica geral.",
            (0, 1, 2, 3, 4),
            ((time(8), time(12)), (time(14), time(17))),
        ),
        (
            "cardiologista@medsync.test",
            "Dr. Bruno Lima",
            "cardiology",
            "CRM-DEMO-002",
            "Cardiologista com foco em prevenção.",
            (0, 2, 4),
            ((time(9), time(12)), (time(13), time(17))),
        ),
        (
            "dermatologista@medsync.test",
            "Dra. Camila Rocha",
            "dermatology",
            "CRM-DEMO-003",
            "Dermatologia clínica para todas as idades.",
            (1, 3, 4),
            ((time(8), time(12)), (time(13), time(16))),
        ),
        (
            "pediatra@medsync.test",
            "Dra. Marina Costa",
            "pediatrics",
            "CRM-DEMO-004",
            "Pediatria e acompanhamento preventivo.",
            (0, 1, 2, 3, 4),
            ((time(10), time(13)), (time(14), time(18))),
        ),
    )

    profiles: list[ProfessionalProfile] = []
    for (
        email,
        full_name,
        specialty_key,
        crm,
        bio,
        weekdays,
        intervals,
    ) in professional_specs:
        user = _get_or_create_user(
            db,
            email=email,
            full_name=full_name,
            role=UserRole.PROFESSIONAL,
        )
        profile = _get_or_create_professional(
            db,
            user=user,
            specialty=specialties[specialty_key],
            crm=crm,
            bio=bio,
        )
        profiles.append(profile)
        _ensure_rules(db, profile, weekdays, intervals)

    db.flush()
    demo_day = _next_business_day(date.today())
    _ensure_demo_appointment(
        db,
        seed_key="demo-upcoming",
        patient=patient,
        professional=profiles[0],
        starts_at=datetime.combine(demo_day, time(9)),
        status=AppointmentStatus.SCHEDULED,
    )
    _ensure_demo_appointment(
        db,
        seed_key="demo-cancelled",
        patient=patient,
        professional=profiles[0],
        starts_at=datetime.combine(demo_day, time(10)),
        status=AppointmentStatus.CANCELLED,
        reason="Consulta de demonstração cancelada",
    )
    db.commit()

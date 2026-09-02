from __future__ import annotations

from datetime import UTC, datetime, time
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class UserRole(str, Enum):
    PATIENT = "patient"
    PROFESSIONAL = "professional"
    ADMIN = "admin"


class PreferredPeriod(str, Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"


def enum_column(enum_type: type[Enum], length: int = 32) -> SAEnum:
    return SAEnum(
        enum_type,
        values_callable=lambda members: [member.value for member in members],
        native_enum=False,
        length=length,
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(512))
    role: Mapped[UserRole] = mapped_column(enum_column(UserRole), index=True)
    preferred_period: Mapped[PreferredPeriod | None] = mapped_column(
        enum_column(PreferredPeriod), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    professional_profile: Mapped[ProfessionalProfile | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    patient_appointments: Mapped[list[Appointment]] = relationship(
        back_populates="patient", foreign_keys="Appointment.patient_id"
    )


class Specialty(Base):
    __tablename__ = "specialties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    professionals: Mapped[list[ProfessionalProfile]] = relationship(
        back_populates="specialty"
    )
    appointments: Mapped[list[Appointment]] = relationship(back_populates="specialty")


class ProfessionalProfile(Base):
    __tablename__ = "professional_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    specialty_id: Mapped[int] = mapped_column(
        ForeignKey("specialties.id", ondelete="RESTRICT"), index=True
    )
    crm: Mapped[str | None] = mapped_column(String(40), unique=True, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="professional_profile")
    specialty: Mapped[Specialty] = relationship(back_populates="professionals")
    availability_rules: Mapped[list[AvailabilityRule]] = relationship(
        back_populates="professional", cascade="all, delete-orphan"
    )
    appointments: Mapped[list[Appointment]] = relationship(
        back_populates="professional"
    )

    @property
    def full_name(self) -> str:
        return self.user.full_name

    @property
    def email(self) -> str:
        return self.user.email


class AvailabilityRule(Base):
    __tablename__ = "availability_rules"
    __table_args__ = (
        UniqueConstraint(
            "professional_id",
            "weekday",
            "start_time",
            "end_time",
            name="uq_availability_exact_rule",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    professional_id: Mapped[int] = mapped_column(
        ForeignKey("professional_profiles.id", ondelete="CASCADE"), index=True
    )
    weekday: Mapped[int] = mapped_column(Integer, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    professional: Mapped[ProfessionalProfile] = relationship(
        back_populates="availability_rules"
    )


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        Index("ix_appointments_professional_start", "professional_id", "starts_at"),
        Index("ix_appointments_patient_start", "patient_id", "starts_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    professional_id: Mapped[int] = mapped_column(
        ForeignKey("professional_profiles.id", ondelete="RESTRICT"), index=True
    )
    specialty_id: Mapped[int] = mapped_column(
        ForeignKey("specialties.id", ondelete="RESTRICT"), index=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[AppointmentStatus] = mapped_column(
        enum_column(AppointmentStatus), default=AppointmentStatus.SCHEDULED, index=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )
    seed_key: Mapped[str | None] = mapped_column(
        String(80), unique=True, nullable=True
    )

    patient: Mapped[User] = relationship(
        back_populates="patient_appointments", foreign_keys=[patient_id]
    )
    professional: Mapped[ProfessionalProfile] = relationship(
        back_populates="appointments"
    )
    specialty: Mapped[Specialty] = relationship(back_populates="appointments")

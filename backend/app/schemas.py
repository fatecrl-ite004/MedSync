from __future__ import annotations

from datetime import datetime, time
import re
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator

from app.models import AppointmentStatus, PreferredPeriod, UserRole


def _validate_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 320 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
        raise ValueError("invalid email address")
    return value


# EmailStr deliberately rejects the reserved .test TLD used by the required demo
# accounts, so the API uses a small syntax validator that accepts safe fixtures.
EmailValue = Annotated[str, AfterValidator(_validate_email)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserRead(ORMModel):
    id: int
    email: EmailValue
    full_name: str
    role: UserRole
    preferred_period: PreferredPeriod | None = None


class RegisterRequest(BaseModel):
    email: EmailValue
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    role: UserRole = UserRole.PATIENT
    preferred_period: PreferredPeriod | None = None
    specialty_id: int | None = None
    crm: str | None = Field(default=None, max_length=40)
    bio: str | None = Field(default=None, max_length=1000)


class LoginRequest(BaseModel):
    email: EmailValue
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class SpecialtyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=1000)


class SpecialtyRead(ORMModel):
    id: int
    name: str
    description: str | None = None


class ProfessionalCreate(BaseModel):
    email: EmailValue
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    specialty_id: int
    crm: str | None = Field(default=None, max_length=40)
    bio: str | None = Field(default=None, max_length=1000)


class ProfessionalSummary(ORMModel):
    id: int
    user_id: int
    full_name: str
    email: EmailValue
    crm: str | None = None


class ProfessionalRead(ProfessionalSummary):
    bio: str | None = None
    specialty: SpecialtyRead


class AvailabilityCreate(BaseModel):
    professional_id: int | None = None
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_interval(self):
        points = (self.start_time, self.end_time)
        if any(value.minute not in {0, 30} or value.second or value.microsecond for value in points):
            raise ValueError("availability must use 30-minute boundaries")
        start_minutes = self.start_time.hour * 60 + self.start_time.minute
        end_minutes = self.end_time.hour * 60 + self.end_time.minute
        if end_minutes - start_minutes < 30:
            raise ValueError("availability must last at least 30 minutes")
        return self


class AvailabilityRead(ORMModel):
    id: int
    professional_id: int
    weekday: int
    start_time: time
    end_time: time


class PatientSummary(ORMModel):
    id: int
    full_name: str
    email: EmailValue


class AppointmentCreate(BaseModel):
    professional_id: int
    starts_at: datetime
    patient_id: int | None = None


class AppointmentReschedule(BaseModel):
    starts_at: datetime


class AppointmentCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class AppointmentRead(ORMModel):
    id: int
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    cancellation_reason: str | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    patient: PatientSummary
    professional: ProfessionalSummary
    specialty: SpecialtyRead


class SlotRead(BaseModel):
    starts_at: datetime
    ends_at: datetime
    period: PreferredPeriod
    recommended: bool
    score: int
    reason: str


class SlotsResponse(BaseModel):
    professional_id: int
    slots: list[SlotRead]


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str

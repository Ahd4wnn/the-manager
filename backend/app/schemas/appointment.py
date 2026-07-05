from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AppointmentStatus


class AppointmentCreate(BaseModel):
    patient_id: int
    provider_id: int | None = None
    scheduled_start: datetime
    scheduled_end: datetime | None = None
    token_number: int | None = None
    reason: str | None = None
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    provider_id: int | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    status: AppointmentStatus | None = None
    token_number: int | None = None
    reason: str | None = None
    notes: str | None = None


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: int
    patient_id: int
    provider_id: int | None = None
    scheduled_start: datetime
    scheduled_end: datetime | None = None
    status: AppointmentStatus
    token_number: int | None = None
    reason: str | None = None
    notes: str | None = None

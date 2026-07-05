from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_roles
from app.database import get_db
from app.models.appointment import Appointment
from app.models.enums import Role
from app.models.patient import Patient
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentUpdate,
)
from app.utils.audit import log_action

router = APIRouter()

_STAFF = require_roles(Role.owner, Role.manager, Role.staff, Role.doctor)


def _get_appt(db: Session, hospital_id: int, appt_id: int) -> Appointment:
    appt = db.get(Appointment, appt_id)
    if (
        appt is None
        or appt.deleted_at is not None
        or appt.hospital_id != hospital_id
    ):
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Appointment:
    patient = db.get(Patient, payload.patient_id)
    if (
        patient is None
        or patient.deleted_at is not None
        or patient.hospital_id != ctx.hospital.id
    ):
        raise HTTPException(status_code=404, detail="Patient not found")

    appt = Appointment(hospital_id=ctx.hospital.id, **payload.model_dump())
    db.add(appt)
    db.flush()
    log_action(
        db,
        action="appointment.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="appointment",
        entity_id=appt.id,
    )
    db.commit()
    db.refresh(appt)
    return appt


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
    patient_id: int | None = None,
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = 0,
) -> list[Appointment]:
    stmt = select(Appointment).where(
        Appointment.hospital_id == ctx.hospital.id,
        Appointment.deleted_at.is_(None),
    )
    if patient_id is not None:
        stmt = stmt.where(Appointment.patient_id == patient_id)
    if date_from is not None:
        stmt = stmt.where(Appointment.scheduled_start >= date_from)
    if date_to is not None:
        stmt = stmt.where(Appointment.scheduled_start <= date_to)
    stmt = stmt.order_by(Appointment.scheduled_start).limit(limit).offset(offset)
    return list(db.scalars(stmt))


@router.get("/{appt_id}", response_model=AppointmentOut)
def get_appointment(
    appt_id: int,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Appointment:
    return _get_appt(db, ctx.hospital.id, appt_id)


@router.patch("/{appt_id}", response_model=AppointmentOut)
def update_appointment(
    appt_id: int,
    payload: AppointmentUpdate,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Appointment:
    appt = _get_appt(db, ctx.hospital.id, appt_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)
    log_action(
        db,
        action="appointment.update",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="appointment",
        entity_id=appt.id,
    )
    db.commit()
    db.refresh(appt)
    return appt


@router.delete("/{appt_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_appointment(
    appt_id: int,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> None:
    appt = _get_appt(db, ctx.hospital.id, appt_id)
    appt.deleted_at = datetime.now(timezone.utc)
    log_action(
        db,
        action="appointment.delete",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="appointment",
        entity_id=appt.id,
    )
    db.commit()

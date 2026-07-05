from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, get_tenant, require_roles
from app.database import get_db
from app.models.enums import Role
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientOut, PatientUpdate
from app.utils.audit import log_action
from app.utils.numbering import next_mrn

router = APIRouter()

# Any hospital role may work with patients.
_STAFF = require_roles(Role.owner, Role.manager, Role.staff, Role.doctor)


def _get_patient(db: Session, hospital_id: int, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if (
        patient is None
        or patient.deleted_at is not None
        or patient.hospital_id != hospital_id
    ):
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Patient:
    patient = Patient(
        hospital_id=ctx.hospital.id,
        mrn=next_mrn(db, ctx.hospital.id),
        **payload.model_dump(),
    )
    db.add(patient)
    db.flush()
    log_action(
        db,
        action="patient.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="patient",
        entity_id=patient.id,
    )
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=list[PatientOut])
def list_patients(
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Search name, phone or MRN"),
    limit: int = Query(50, le=200),
    offset: int = 0,
) -> list[Patient]:
    stmt = select(Patient).where(
        Patient.hospital_id == ctx.hospital.id,
        Patient.deleted_at.is_(None),
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Patient.full_name.ilike(like),
                Patient.phone.ilike(like),
                Patient.mrn.ilike(like),
            )
        )
    stmt = stmt.order_by(Patient.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt))


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Patient:
    return _get_patient(db, ctx.hospital.id, patient_id)


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Patient:
    patient = _get_patient(db, ctx.hospital.id, patient_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    log_action(
        db,
        action="patient.update",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="patient",
        entity_id=patient.id,
    )
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int,
    ctx: TenantContext = Depends(require_roles(Role.owner, Role.manager)),
    db: Session = Depends(get_db),
) -> None:
    from datetime import datetime, timezone

    patient = _get_patient(db, ctx.hospital.id, patient_id)
    patient.deleted_at = datetime.now(timezone.utc)  # soft delete
    log_action(
        db,
        action="patient.delete",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="patient",
        entity_id=patient.id,
    )
    db.commit()

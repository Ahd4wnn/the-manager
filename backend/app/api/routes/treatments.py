from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_roles
from app.database import get_db
from app.models.enums import Role
from app.models.patient import Patient
from app.models.treatment import EncounterTreatment, Treatment
from app.schemas.treatment import (
    EncounterTreatmentCreate,
    EncounterTreatmentOut,
    TreatmentCreate,
    TreatmentOut,
    TreatmentUpdate,
)
from app.utils.audit import log_action

router = APIRouter()

_STAFF = require_roles(Role.owner, Role.manager, Role.staff, Role.doctor)
_MANAGE = require_roles(Role.owner, Role.manager)


# ---- Catalog ----
@router.post("/catalog", response_model=TreatmentOut, status_code=status.HTTP_201_CREATED)
def create_treatment(
    payload: TreatmentCreate,
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
) -> Treatment:
    treatment = Treatment(hospital_id=ctx.hospital.id, **payload.model_dump())
    db.add(treatment)
    db.flush()
    log_action(
        db,
        action="treatment.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="treatment",
        entity_id=treatment.id,
    )
    db.commit()
    db.refresh(treatment)
    return treatment


@router.get("/catalog", response_model=list[TreatmentOut])
def list_treatments(
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
    active_only: bool = True,
) -> list[Treatment]:
    stmt = select(Treatment).where(
        Treatment.hospital_id == ctx.hospital.id,
        Treatment.deleted_at.is_(None),
    )
    if active_only:
        stmt = stmt.where(Treatment.is_active.is_(True))
    return list(db.scalars(stmt.order_by(Treatment.name)))


@router.patch("/catalog/{treatment_id}", response_model=TreatmentOut)
def update_treatment(
    treatment_id: int,
    payload: TreatmentUpdate,
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
) -> Treatment:
    treatment = db.get(Treatment, treatment_id)
    if (
        treatment is None
        or treatment.deleted_at is not None
        or treatment.hospital_id != ctx.hospital.id
    ):
        raise HTTPException(status_code=404, detail="Treatment not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(treatment, field, value)
    db.commit()
    db.refresh(treatment)
    return treatment


# ---- Encounter treatments (given to a patient) ----
@router.post(
    "/encounters", response_model=EncounterTreatmentOut, status_code=status.HTTP_201_CREATED
)
def record_encounter_treatment(
    payload: EncounterTreatmentCreate,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> EncounterTreatment:
    patient = db.get(Patient, payload.patient_id)
    if (
        patient is None
        or patient.deleted_at is not None
        or patient.hospital_id != ctx.hospital.id
    ):
        raise HTTPException(status_code=404, detail="Patient not found")

    name = payload.name
    unit_price = payload.unit_price
    gst_rate = payload.gst_rate

    if payload.treatment_id is not None:
        treatment = db.get(Treatment, payload.treatment_id)
        if (
            treatment is None
            or treatment.deleted_at is not None
            or treatment.hospital_id != ctx.hospital.id
        ):
            raise HTTPException(status_code=404, detail="Treatment not found")
        name = name or treatment.name
        unit_price = unit_price if unit_price is not None else treatment.default_price
        gst_rate = gst_rate if gst_rate is not None else treatment.gst_rate

    if name is None or unit_price is None:
        raise HTTPException(
            status_code=422,
            detail="Provide a treatment_id or an explicit name and unit_price",
        )

    enc = EncounterTreatment(
        hospital_id=ctx.hospital.id,
        patient_id=payload.patient_id,
        appointment_id=payload.appointment_id,
        treatment_id=payload.treatment_id,
        performed_by=ctx.user.id,
        name=name,
        quantity=payload.quantity,
        unit_price=unit_price,
        gst_rate=gst_rate if gst_rate is not None else Decimal("0"),
        notes=payload.notes,
    )
    db.add(enc)
    db.flush()
    log_action(
        db,
        action="encounter_treatment.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="encounter_treatment",
        entity_id=enc.id,
    )
    db.commit()
    db.refresh(enc)
    return enc


@router.get("/encounters", response_model=list[EncounterTreatmentOut])
def list_encounter_treatments(
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
    patient_id: int | None = None,
    uninvoiced_only: bool = False,
    limit: int = Query(100, le=500),
    offset: int = 0,
) -> list[EncounterTreatment]:
    stmt = select(EncounterTreatment).where(
        EncounterTreatment.hospital_id == ctx.hospital.id,
        EncounterTreatment.deleted_at.is_(None),
    )
    if patient_id is not None:
        stmt = stmt.where(EncounterTreatment.patient_id == patient_id)
    if uninvoiced_only:
        stmt = stmt.where(EncounterTreatment.invoiced.is_(False))
    stmt = stmt.order_by(EncounterTreatment.performed_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt))

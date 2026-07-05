from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_roles
from app.database import get_db
from app.models.enums import MedicineLogAction, Role
from app.models.medicine import Medicine, MedicineLog
from app.models.patient import Patient
from app.schemas.medicine import (
    MedicineCreate,
    MedicineLogCreate,
    MedicineLogOut,
    MedicineOut,
    MedicineUpdate,
)
from app.utils.audit import log_action

router = APIRouter()

_STAFF = require_roles(Role.owner, Role.manager, Role.staff, Role.doctor)
_MANAGE = require_roles(Role.owner, Role.manager)


def _get(db: Session, hospital_id: int, medicine_id: int) -> Medicine:
    m = db.get(Medicine, medicine_id)
    if m is None or m.deleted_at is not None or m.hospital_id != hospital_id:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return m


@router.post("", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def create_medicine(
    payload: MedicineCreate,
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
) -> Medicine:
    med = Medicine(hospital_id=ctx.hospital.id, **payload.model_dump())
    db.add(med)
    db.flush()
    log_action(
        db,
        action="medicine.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="medicine",
        entity_id=med.id,
    )
    db.commit()
    db.refresh(med)
    return med


@router.get("", response_model=list[MedicineOut])
def list_medicines(
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
    active_only: bool = True,
) -> list[Medicine]:
    stmt = select(Medicine).where(
        Medicine.hospital_id == ctx.hospital.id, Medicine.deleted_at.is_(None)
    )
    if active_only:
        stmt = stmt.where(Medicine.is_active.is_(True))
    return list(db.scalars(stmt.order_by(Medicine.name)))


@router.patch("/{medicine_id}", response_model=MedicineOut)
def update_medicine(
    medicine_id: int,
    payload: MedicineUpdate,
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
) -> Medicine:
    med = _get(db, ctx.hospital.id, medicine_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(med, field, value)
    db.commit()
    db.refresh(med)
    return med


@router.post("/logs", response_model=MedicineLogOut, status_code=status.HTTP_201_CREATED)
def add_log(
    payload: MedicineLogCreate,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> MedicineLog:
    med = _get(db, ctx.hospital.id, payload.medicine_id)

    if payload.patient_id is not None:
        patient = db.get(Patient, payload.patient_id)
        if patient is None or patient.hospital_id != ctx.hospital.id:
            raise HTTPException(status_code=404, detail="Patient not found")

    qty = Decimal(payload.quantity or 0)
    # Update stock depending on the action.
    if payload.action == MedicineLogAction.restock:
        med.current_stock = Decimal(med.current_stock) + qty
    elif payload.action == MedicineLogAction.use:
        med.current_stock = Decimal(med.current_stock) - qty
    elif payload.action == MedicineLogAction.adjust:
        med.current_stock = Decimal(med.current_stock) + qty  # qty may be negative
    # open_packet is a tracking event only; no numeric change.

    entry = MedicineLog(
        hospital_id=ctx.hospital.id,
        medicine_id=med.id,
        action=payload.action,
        quantity=qty,
        patient_id=payload.patient_id,
        performed_by=ctx.user.id,
        note=payload.note,
    )
    db.add(entry)
    db.flush()
    log_action(
        db,
        action=f"medicine.{payload.action.value}",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="medicine",
        entity_id=med.id,
        detail=f"qty={qty}",
    )
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/logs", response_model=list[MedicineLogOut])
def list_logs(
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
    medicine_id: int | None = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
) -> list[MedicineLog]:
    stmt = select(MedicineLog).where(MedicineLog.hospital_id == ctx.hospital.id)
    if medicine_id is not None:
        stmt = stmt.where(MedicineLog.medicine_id == medicine_id)
    stmt = stmt.order_by(MedicineLog.happened_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt))

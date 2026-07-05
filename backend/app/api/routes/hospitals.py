from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, get_current_user, get_tenant, require_platform_admin
from app.database import get_db
from app.models.hospital import Hospital
from app.models.membership import Membership
from app.models.user import User
from app.schemas.hospital import HospitalCreate, HospitalOut, HospitalUpdate
from app.utils.audit import log_action

router = APIRouter()


@router.post("", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
) -> Hospital:
    if db.scalar(select(Hospital).where(Hospital.code == payload.code)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hospital code already in use",
        )
    hospital = Hospital(**payload.model_dump())
    db.add(hospital)
    db.flush()
    log_action(
        db,
        action="hospital.create",
        user_id=admin.id,
        hospital_id=hospital.id,
        entity_type="hospital",
        entity_id=hospital.id,
    )
    db.commit()
    db.refresh(hospital)
    return hospital


@router.get("", response_model=list[HospitalOut])
def list_hospitals(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Hospital]:
    stmt = select(Hospital).where(Hospital.deleted_at.is_(None))
    if not user.is_platform_admin:
        hospital_ids = [m.hospital_id for m in user.memberships]
        stmt = stmt.where(Hospital.id.in_(hospital_ids or [-1]))
    return list(db.scalars(stmt.order_by(Hospital.name)))


@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital(ctx: TenantContext = Depends(get_tenant)) -> Hospital:
    # get_tenant already validated access via X-Hospital-Id header.
    return ctx.hospital


@router.patch("/{hospital_id}", response_model=HospitalOut)
def update_hospital(
    hospital_id: int,
    payload: HospitalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Hospital:
    hospital = db.get(Hospital, hospital_id)
    if hospital is None or hospital.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Hospital not found")

    # Only platform admin or an owner of this hospital may edit it.
    allowed = user.is_platform_admin or any(
        m.hospital_id == hospital_id and m.role.value == "owner"
        for m in user.memberships
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Not allowed to edit this hospital")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(hospital, field, value)
    log_action(
        db,
        action="hospital.update",
        user_id=user.id,
        hospital_id=hospital.id,
        entity_type="hospital",
        entity_id=hospital.id,
    )
    db.commit()
    db.refresh(hospital)
    return hospital

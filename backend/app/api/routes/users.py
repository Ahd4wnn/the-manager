from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, get_tenant, require_platform_admin, require_roles
from app.core.security import hash_password
from app.database import get_db
from app.models.enums import Role
from app.models.hospital import Hospital
from app.models.membership import Membership
from app.models.user import User
from app.schemas.user import OwnerCreate, StaffCreate, UserOut, UserWithRole
from app.utils.audit import log_action

router = APIRouter()


def _get_or_create_user(
    db: Session, *, phone: str, full_name: str, password: str, email: str | None
) -> User:
    existing = db.scalar(select(User).where(User.phone == phone))
    if existing:
        return existing
    user = User(
        phone=phone,
        full_name=full_name,
        email=email,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.flush()
    return user


@router.post("/owners", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_owner(
    payload: OwnerCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
) -> User:
    """Platform admin creates an owner, optionally attaching them to a hospital."""
    user = _get_or_create_user(
        db,
        phone=payload.phone,
        full_name=payload.full_name,
        password=payload.password,
        email=payload.email,
    )
    if payload.hospital_id is not None:
        hospital = db.get(Hospital, payload.hospital_id)
        if hospital is None or hospital.deleted_at is not None:
            raise HTTPException(status_code=404, detail="Hospital not found")
        _attach_membership(db, user.id, payload.hospital_id, Role.owner)

    log_action(
        db,
        action="user.create_owner",
        user_id=admin.id,
        hospital_id=payload.hospital_id,
        entity_type="user",
        entity_id=user.id,
    )
    db.commit()
    db.refresh(user)
    return user


def _attach_membership(
    db: Session,
    user_id: int,
    hospital_id: int,
    role: Role,
    designation: str | None = None,
    monthly_salary=None,
) -> Membership:
    existing = db.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.hospital_id == hospital_id,
        )
    )
    if existing:
        existing.role = role
        if designation is not None:
            existing.designation = designation
        if monthly_salary is not None:
            existing.monthly_salary = monthly_salary
        return existing
    membership = Membership(
        user_id=user_id,
        hospital_id=hospital_id,
        role=role,
        designation=designation,
        monthly_salary=monthly_salary,
    )
    db.add(membership)
    db.flush()
    return membership


@router.post("", response_model=UserWithRole, status_code=status.HTTP_201_CREATED)
def create_hospital_user(
    payload: StaffCreate,
    ctx: TenantContext = Depends(require_roles(Role.owner, Role.manager)),
    db: Session = Depends(get_db),
) -> UserWithRole:
    """Owner/Manager adds a manager/staff/doctor to the current hospital."""
    if payload.role in (Role.admin, Role.owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create admin/owner from here",
        )
    # Managers may only create staff/doctor, not other managers.
    if ctx.role == Role.manager and payload.role == Role.manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers cannot create other managers",
        )

    user = _get_or_create_user(
        db,
        phone=payload.phone,
        full_name=payload.full_name,
        password=payload.password,
        email=payload.email,
    )
    _attach_membership(
        db,
        user.id,
        ctx.hospital.id,
        payload.role,
        designation=payload.designation,
        monthly_salary=payload.monthly_salary,
    )
    log_action(
        db,
        action="user.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="user",
        entity_id=user.id,
        detail=f"role={payload.role.value}",
    )
    db.commit()
    db.refresh(user)
    return UserWithRole(
        id=user.id,
        phone=user.phone,
        full_name=user.full_name,
        email=user.email,
        is_active=user.is_active,
        role=payload.role,
        designation=payload.designation,
        monthly_salary=payload.monthly_salary,
    )


@router.get("", response_model=list[UserWithRole])
def list_hospital_users(
    ctx: TenantContext = Depends(require_roles(Role.owner, Role.manager)),
    db: Session = Depends(get_db),
) -> list[UserWithRole]:
    rows = db.execute(
        select(User, Membership)
        .join(Membership, Membership.user_id == User.id)
        .where(
            Membership.hospital_id == ctx.hospital.id,
            User.deleted_at.is_(None),
        )
        .order_by(User.full_name)
    ).all()
    return [
        UserWithRole(
            id=u.id,
            phone=u.phone,
            full_name=u.full_name,
            email=u.email,
            is_active=u.is_active,
            role=m.role,
            designation=m.designation,
            monthly_salary=m.monthly_salary,
        )
        for u, m in rows
    ]

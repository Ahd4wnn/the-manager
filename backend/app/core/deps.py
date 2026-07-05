from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import decode_access_token
from app.database import get_db
from app.models.enums import Role
from app.models.hospital import Hospital
from app.models.membership import Membership
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    subject = decode_access_token(token)
    if subject is None:
        raise credentials_exc
    user = db.get(User, int(subject))
    if user is None or user.deleted_at is not None or not user.is_active:
        raise credentials_exc
    return user


def require_platform_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )
    return user


@dataclass
class TenantContext:
    """The hospital the request operates on, plus the caller's role there."""

    user: User
    hospital: Hospital
    role: Role


def get_tenant(
    x_hospital_id: int = Header(..., alias="X-Hospital-Id"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TenantContext:
    hospital = db.get(Hospital, x_hospital_id)
    if hospital is None or hospital.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found"
        )

    # Platform admin can act on any hospital.
    if user.is_platform_admin:
        return TenantContext(user=user, hospital=hospital, role=Role.admin)

    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.hospital_id == hospital.id,
        )
    )
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this hospital",
        )
    return TenantContext(user=user, hospital=hospital, role=membership.role)


def require_roles(*allowed: Role):
    """Dependency factory: caller must hold one of the allowed roles in the tenant."""

    def _guard(ctx: TenantContext = Depends(get_tenant)) -> TenantContext:
        if ctx.role not in allowed and ctx.role != Role.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role for this action",
            )
        return ctx

    return _guard

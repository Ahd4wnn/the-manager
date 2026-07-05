from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import Me, MembershipInfo, Token

router = APIRouter()


def _authenticate(db: Session, phone: str, password: str) -> User:
    user = db.scalar(select(User).where(User.phone == phone))
    if (
        user is None
        or user.deleted_at is not None
        or not user.is_active
        or not verify_password(password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone or password",
        )
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    """OAuth2 password flow — `username` is the phone number."""
    user = _authenticate(db, form_data.username, form_data.password)
    return Token(access_token=create_access_token(subject=user.id))


@router.get("/me", response_model=Me)
def me(user: User = Depends(get_current_user)) -> Me:
    return Me(
        id=user.id,
        phone=user.phone,
        full_name=user.full_name,
        email=user.email,
        is_platform_admin=user.is_platform_admin,
        memberships=[
            MembershipInfo(
                hospital_id=m.hospital_id,
                hospital_name=m.hospital.name,
                role=m.role.value,
            )
            for m in user.memberships
        ],
    )

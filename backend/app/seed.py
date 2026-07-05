"""Seed the first platform admin. Idempotent — safe to run repeatedly.

Usage:  python -m app.seed
"""

from sqlalchemy import select

from app.config import settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(
            select(User).where(User.phone == settings.first_admin_phone)
        )
        if existing:
            print(f"Admin already exists (phone={existing.phone}); nothing to do.")
            return
        admin = User(
            phone=settings.first_admin_phone,
            full_name=settings.first_admin_name,
            hashed_password=hash_password(settings.first_admin_password),
            is_platform_admin=True,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Created platform admin: phone={admin.phone}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

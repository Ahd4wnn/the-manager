from sqlalchemy import Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import Role


class Membership(Base, TimestampMixin):
    """Links a user to a hospital with a role. One login can span hospitals."""

    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "hospital_id", name="uq_user_hospital"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[Role] = mapped_column(Enum(Role, name="role"), nullable=False)

    user = relationship("User", back_populates="memberships")
    hospital = relationship("Hospital", back_populates="memberships")

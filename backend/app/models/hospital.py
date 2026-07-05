from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Hospital(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Short code used as MRN / invoice prefix, e.g. "HOSP01"
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)

    address: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))

    # India billing settings
    gstin: Mapped[str | None] = mapped_column(String(20))
    upi_vpa: Mapped[str | None] = mapped_column(String(120))   # e.g. clinic@okhdfc
    upi_payee_name: Mapped[str | None] = mapped_column(String(120))

    # Running counters for per-hospital sequential numbering
    patient_seq: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invoice_seq: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    memberships = relationship(
        "Membership", back_populates="hospital", cascade="all, delete-orphan"
    )

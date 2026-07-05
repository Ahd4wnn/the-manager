from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import MedicineLogAction


class Medicine(Base, TimestampMixin, SoftDeleteMixin):
    """A medicine/consumable in a hospital's inventory."""

    __tablename__ = "medicines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    unit: Mapped[str] = mapped_column(String(40), default="unit", nullable=False)  # tablet, ml…
    pack_size: Mapped[int | None] = mapped_column(Integer)  # units per packet/strip

    current_stock: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    low_stock_threshold: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    logs = relationship(
        "MedicineLog", back_populates="medicine", cascade="all, delete-orphan"
    )


class MedicineLog(Base, TimestampMixin):
    """Every stock event: restock, opening a new packet, or usage."""

    __tablename__ = "medicine_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    medicine_id: Mapped[int] = mapped_column(
        ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action: Mapped[MedicineLogAction] = mapped_column(
        Enum(MedicineLogAction, name="medicine_log_action"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    # Optional link to a patient (e.g. medicine dispensed during a visit)
    patient_id: Mapped[int | None] = mapped_column(
        ForeignKey("patients.id", ondelete="SET NULL"), index=True
    )
    performed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    note: Mapped[str | None] = mapped_column(Text)
    happened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    medicine = relationship("Medicine", back_populates="logs")

from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import Gender, PatientType


class Patient(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "patients"
    __table_args__ = (
        UniqueConstraint("hospital_id", "mrn", name="uq_hospital_mrn"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Medical Record Number, unique per hospital, e.g. HOSP01-000123
    mrn: Mapped[str] = mapped_column(String(40), nullable=False, index=True)

    patient_type: Mapped[PatientType] = mapped_column(
        Enum(PatientType, name="patient_type"), nullable=False
    )

    full_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender, name="gender"))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    phone: Mapped[str | None] = mapped_column(String(20), index=True)
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(500))

    # Emergency contact
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150))
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20))

    # Clinical
    blood_group: Mapped[str | None] = mapped_column(String(5))
    allergies: Mapped[str | None] = mapped_column(Text)
    medical_history: Mapped[str | None] = mapped_column(Text)

    id_number: Mapped[str | None] = mapped_column(String(50))       # Aadhaar/other
    insurance_number: Mapped[str | None] = mapped_column(String(50))

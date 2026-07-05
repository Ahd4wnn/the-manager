from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class TreatmentBase(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    default_price: Decimal = Decimal("0")
    gst_rate: Decimal = Decimal("0")
    hsn_sac: str | None = None
    default_duration_min: int | None = None


class TreatmentCreate(TreatmentBase):
    pass


class TreatmentUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    default_price: Decimal | None = None
    gst_rate: Decimal | None = None
    hsn_sac: str | None = None
    default_duration_min: int | None = None
    is_active: bool | None = None


class TreatmentOut(TreatmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: int
    is_active: bool


class EncounterTreatmentCreate(BaseModel):
    patient_id: int
    treatment_id: int | None = None
    appointment_id: int | None = None
    # If omitted, name/unit_price/gst_rate are copied from the catalog treatment.
    name: str | None = None
    quantity: int = 1
    unit_price: Decimal | None = None
    gst_rate: Decimal | None = None
    notes: str | None = None


class EncounterTreatmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: int
    patient_id: int
    appointment_id: int | None = None
    treatment_id: int | None = None
    name: str
    quantity: int
    unit_price: Decimal
    gst_rate: Decimal
    performed_at: datetime
    notes: str | None = None
    invoiced: bool

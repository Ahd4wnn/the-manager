from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import MedicineLogAction


class MedicineCreate(BaseModel):
    name: str
    unit: str = "unit"
    pack_size: int | None = None
    current_stock: Decimal = Decimal("0")
    low_stock_threshold: Decimal = Decimal("0")


class MedicineUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    pack_size: int | None = None
    low_stock_threshold: Decimal | None = None
    is_active: bool | None = None


class MedicineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: int
    name: str
    unit: str
    pack_size: int | None = None
    current_stock: Decimal
    low_stock_threshold: Decimal
    is_active: bool


class MedicineLogCreate(BaseModel):
    medicine_id: int
    action: MedicineLogAction
    quantity: Decimal = Decimal("0")
    patient_id: int | None = None
    note: str | None = None


class MedicineLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    medicine_id: int
    action: MedicineLogAction
    quantity: Decimal
    patient_id: int | None = None
    note: str | None = None
    happened_at: datetime

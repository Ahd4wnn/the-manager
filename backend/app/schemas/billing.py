from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import InvoiceStatus, PaymentMethod


class InvoiceItemInput(BaseModel):
    description: str
    quantity: int = 1
    unit_price: Decimal
    gst_rate: Decimal = Decimal("0")
    encounter_treatment_id: int | None = None


class InvoiceCreate(BaseModel):
    patient_id: int
    # Explicit line items; if empty, uninvoiced encounter treatments are pulled in.
    items: list[InvoiceItemInput] = []
    pull_encounter_treatments: bool = True
    discount_amount: Decimal = Decimal("0")
    notes: str | None = None


class InvoiceItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    description: str
    quantity: int
    unit_price: Decimal
    gst_rate: Decimal
    line_total: Decimal
    tax_amount: Decimal


class PaymentCreate(BaseModel):
    amount: Decimal
    method: PaymentMethod
    reference: str | None = None
    notes: str | None = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_id: int
    amount: Decimal
    method: PaymentMethod
    reference: str | None = None
    received_at: datetime
    notes: str | None = None


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: int
    patient_id: int
    invoice_number: str
    status: InvoiceStatus
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    issued_at: datetime | None = None
    notes: str | None = None
    items: list[InvoiceItemOut] = []
    payments: list[PaymentOut] = []


class UpiQrOut(BaseModel):
    invoice_number: str
    amount: Decimal
    upi_uri: str
    qr_png_base64: str

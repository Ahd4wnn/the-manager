from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_roles
from app.database import get_db
from app.models.billing import Invoice, InvoiceItem, Payment
from app.models.enums import InvoiceStatus, Role
from app.models.patient import Patient
from app.models.treatment import EncounterTreatment
from app.schemas.billing import (
    InvoiceCreate,
    InvoiceOut,
    PaymentCreate,
    PaymentOut,
    UpiQrOut,
)
from app.utils.audit import log_action
from app.utils.numbering import next_invoice_number
from app.utils.upi import build_upi_uri, qr_png_base64

router = APIRouter()

_STAFF = require_roles(Role.owner, Role.manager, Role.staff, Role.doctor)
_MANAGE = require_roles(Role.owner, Role.manager)

TWO_DP = Decimal("0.01")


def _get_invoice(db: Session, hospital_id: int, invoice_id: int) -> Invoice:
    invoice = db.get(Invoice, invoice_id)
    if (
        invoice is None
        or invoice.deleted_at is not None
        or invoice.hospital_id != hospital_id
    ):
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


def _recompute_totals(invoice: Invoice) -> None:
    subtotal = Decimal("0")
    tax = Decimal("0")
    for item in invoice.items:
        line = (item.unit_price * item.quantity).quantize(TWO_DP)
        item.line_total = line
        item.tax_amount = (line * item.gst_rate / Decimal("100")).quantize(TWO_DP)
        subtotal += line
        tax += item.tax_amount
    invoice.subtotal = subtotal
    invoice.tax_amount = tax
    invoice.total_amount = (subtotal + tax - invoice.discount_amount).quantize(TWO_DP)


def _refresh_payment_status(invoice: Invoice) -> None:
    paid = sum((p.amount for p in invoice.payments), Decimal("0"))
    invoice.amount_paid = paid
    if invoice.status == InvoiceStatus.cancelled:
        return
    if paid <= 0:
        invoice.status = (
            InvoiceStatus.issued
            if invoice.issued_at is not None
            else InvoiceStatus.draft
        )
    elif paid < invoice.total_amount:
        invoice.status = InvoiceStatus.partially_paid
    else:
        invoice.status = InvoiceStatus.paid


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Invoice:
    patient = db.get(Patient, payload.patient_id)
    if (
        patient is None
        or patient.deleted_at is not None
        or patient.hospital_id != ctx.hospital.id
    ):
        raise HTTPException(status_code=404, detail="Patient not found")

    invoice = Invoice(
        hospital_id=ctx.hospital.id,
        patient_id=payload.patient_id,
        invoice_number=next_invoice_number(db, ctx.hospital.id),
        status=InvoiceStatus.draft,
        discount_amount=payload.discount_amount,
        notes=payload.notes,
        created_by=ctx.user.id,
    )
    db.add(invoice)
    db.flush()

    # Explicit line items
    for item in payload.items:
        invoice.items.append(
            InvoiceItem(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                gst_rate=item.gst_rate,
                encounter_treatment_id=item.encounter_treatment_id,
                line_total=Decimal("0"),
            )
        )

    # Pull uninvoiced encounter treatments for this patient
    if payload.pull_encounter_treatments:
        encounters = db.scalars(
            select(EncounterTreatment).where(
                EncounterTreatment.hospital_id == ctx.hospital.id,
                EncounterTreatment.patient_id == payload.patient_id,
                EncounterTreatment.invoiced.is_(False),
                EncounterTreatment.deleted_at.is_(None),
            )
        ).all()
        for enc in encounters:
            invoice.items.append(
                InvoiceItem(
                    description=enc.name,
                    quantity=enc.quantity,
                    unit_price=enc.unit_price,
                    gst_rate=enc.gst_rate,
                    encounter_treatment_id=enc.id,
                    line_total=Decimal("0"),
                )
            )
            enc.invoiced = True

    if not invoice.items:
        raise HTTPException(
            status_code=422, detail="Invoice must have at least one line item"
        )

    _recompute_totals(invoice)
    _refresh_payment_status(invoice)
    log_action(
        db,
        action="invoice.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="invoice",
        entity_id=invoice.id,
    )
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("", response_model=list[InvoiceOut])
def list_invoices(
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
    patient_id: int | None = None,
    status_filter: InvoiceStatus | None = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    offset: int = 0,
) -> list[Invoice]:
    stmt = select(Invoice).where(
        Invoice.hospital_id == ctx.hospital.id,
        Invoice.deleted_at.is_(None),
    )
    if patient_id is not None:
        stmt = stmt.where(Invoice.patient_id == patient_id)
    if status_filter is not None:
        stmt = stmt.where(Invoice.status == status_filter)
    stmt = stmt.order_by(Invoice.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt))


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Invoice:
    return _get_invoice(db, ctx.hospital.id, invoice_id)


@router.post("/{invoice_id}/issue", response_model=InvoiceOut)
def issue_invoice(
    invoice_id: int,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Invoice:
    invoice = _get_invoice(db, ctx.hospital.id, invoice_id)
    if invoice.status == InvoiceStatus.cancelled:
        raise HTTPException(status_code=409, detail="Invoice is cancelled")
    if invoice.issued_at is None:
        invoice.issued_at = datetime.now(timezone.utc)
    _refresh_payment_status(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post(
    "/{invoice_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED
)
def add_payment(
    invoice_id: int,
    payload: PaymentCreate,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> Payment:
    invoice = _get_invoice(db, ctx.hospital.id, invoice_id)
    if invoice.status == InvoiceStatus.cancelled:
        raise HTTPException(status_code=409, detail="Invoice is cancelled")
    if payload.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")

    payment = Payment(
        hospital_id=ctx.hospital.id,
        invoice_id=invoice.id,
        amount=payload.amount,
        method=payload.method,
        reference=payload.reference,
        notes=payload.notes,
        received_by=ctx.user.id,
    )
    db.add(payment)
    invoice.payments.append(payment)
    db.flush()
    _refresh_payment_status(invoice)
    log_action(
        db,
        action="payment.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="payment",
        entity_id=payment.id,
        detail=f"invoice={invoice.invoice_number} amount={payload.amount}",
    )
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/{invoice_id}/upi-qr", response_model=UpiQrOut)
def invoice_upi_qr(
    invoice_id: int,
    ctx: TenantContext = Depends(_STAFF),
    db: Session = Depends(get_db),
) -> UpiQrOut:
    invoice = _get_invoice(db, ctx.hospital.id, invoice_id)
    hospital = ctx.hospital
    if not hospital.upi_vpa:
        raise HTTPException(
            status_code=422,
            detail="Hospital has no UPI VPA configured (set upi_vpa in hospital settings)",
        )
    amount = invoice.balance_due if invoice.balance_due > 0 else invoice.total_amount
    payee = hospital.upi_payee_name or hospital.name
    uri = build_upi_uri(
        vpa=hospital.upi_vpa,
        payee_name=payee,
        amount=amount,
        note=invoice.invoice_number,
    )
    return UpiQrOut(
        invoice_number=invoice.invoice_number,
        amount=amount,
        upi_uri=uri,
        qr_png_base64=qr_png_base64(uri),
    )

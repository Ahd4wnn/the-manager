"""Per-hospital sequential numbering for MRNs and invoices.

Uses a row-level lock on the hospital to keep sequences gap-free and unique
under concurrency.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hospital import Hospital


def next_mrn(db: Session, hospital_id: int) -> str:
    hospital = db.execute(
        select(Hospital).where(Hospital.id == hospital_id).with_for_update()
    ).scalar_one()
    hospital.patient_seq += 1
    db.flush()
    return f"{hospital.code}-{hospital.patient_seq:06d}"


def next_invoice_number(db: Session, hospital_id: int) -> str:
    hospital = db.execute(
        select(Hospital).where(Hospital.id == hospital_id).with_for_update()
    ).scalar_one()
    hospital.invoice_seq += 1
    db.flush()
    return f"{hospital.code}-INV-{hospital.invoice_seq:06d}"

"""Financial and staff-performance aggregation used by the report endpoints
and the Excel export."""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.billing import Invoice, Payment
from app.models.expense import Expense
from app.models.membership import Membership
from app.models.patient import Patient
from app.models.treatment import EncounterTreatment
from app.models.user import User
from app.schemas.report import (
    Bucket,
    FinancialSummary,
    StaffPerformance,
    StaffPerformanceReport,
)

Granularity = str  # "daily" | "weekly" | "monthly"


def _start(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _end(d: date) -> datetime:
    return datetime.combine(d + timedelta(days=1), time.min, tzinfo=timezone.utc)


def _bucket_label(d: date, granularity: Granularity) -> str:
    if granularity == "monthly":
        return d.strftime("%Y-%m")
    if granularity == "weekly":
        iso = d.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"
    return d.isoformat()


def financial_summary(
    db: Session,
    hospital_id: int,
    from_date: date,
    to_date: date,
    granularity: Granularity = "daily",
) -> FinancialSummary:
    start, end = _start(from_date), _end(to_date)

    # Revenue = payments received in range
    payments = db.execute(
        select(Payment.received_at, Payment.amount).where(
            Payment.hospital_id == hospital_id,
            Payment.deleted_at.is_(None),
            Payment.received_at >= start,
            Payment.received_at < end,
        )
    ).all()

    expenses = db.execute(
        select(Expense.spent_on, Expense.amount).where(
            Expense.hospital_id == hospital_id,
            Expense.deleted_at.is_(None),
            Expense.spent_on >= from_date,
            Expense.spent_on <= to_date,
        )
    ).all()

    rev_by: dict[str, Decimal] = {}
    exp_by: dict[str, Decimal] = {}
    total_revenue = Decimal("0")
    total_expenses = Decimal("0")

    for received_at, amount in payments:
        label = _bucket_label(received_at.date(), granularity)
        rev_by[label] = rev_by.get(label, Decimal("0")) + amount
        total_revenue += amount
    for spent_on, amount in expenses:
        label = _bucket_label(spent_on, granularity)
        exp_by[label] = exp_by.get(label, Decimal("0")) + amount
        total_expenses += amount

    labels = sorted(set(rev_by) | set(exp_by))
    buckets = [
        Bucket(
            label=lbl,
            revenue=rev_by.get(lbl, Decimal("0")),
            expenses=exp_by.get(lbl, Decimal("0")),
            net=rev_by.get(lbl, Decimal("0")) - exp_by.get(lbl, Decimal("0")),
        )
        for lbl in labels
    ]

    # Invoices issued in range
    invoiced = db.scalar(
        select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(
            Invoice.hospital_id == hospital_id,
            Invoice.deleted_at.is_(None),
            Invoice.created_at >= start,
            Invoice.created_at < end,
        )
    ) or Decimal("0")
    invoice_count = db.scalar(
        select(func.count(Invoice.id)).where(
            Invoice.hospital_id == hospital_id,
            Invoice.deleted_at.is_(None),
            Invoice.created_at >= start,
            Invoice.created_at < end,
        )
    ) or 0
    # Outstanding across all live invoices (not just the range)
    outstanding = db.scalar(
        select(
            func.coalesce(func.sum(Invoice.total_amount - Invoice.amount_paid), 0)
        ).where(
            Invoice.hospital_id == hospital_id,
            Invoice.deleted_at.is_(None),
            Invoice.status != "cancelled",
        )
    ) or Decimal("0")
    patients = db.scalar(
        select(func.count(Patient.id)).where(
            Patient.hospital_id == hospital_id,
            Patient.deleted_at.is_(None),
            Patient.created_at >= start,
            Patient.created_at < end,
        )
    ) or 0

    return FinancialSummary(
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net=total_revenue - total_expenses,
        invoiced=Decimal(invoiced),
        outstanding=Decimal(outstanding),
        patients=int(patients),
        invoices=int(invoice_count),
        buckets=buckets,
    )


def staff_performance(
    db: Session, hospital_id: int, from_date: date, to_date: date
) -> StaffPerformanceReport:
    start, end = _start(from_date), _end(to_date)

    members = db.execute(
        select(User, Membership)
        .join(Membership, Membership.user_id == User.id)
        .where(Membership.hospital_id == hospital_id, User.deleted_at.is_(None))
    ).all()

    def _count(model, user_col, extra_time_col):
        rows = db.execute(
            select(user_col, func.count()).where(
                model.hospital_id == hospital_id,
                extra_time_col >= start,
                extra_time_col < end,
            ).group_by(user_col)
        ).all()
        return {uid: cnt for uid, cnt in rows if uid is not None}

    # patients registered has no created_by; skip attributing — count treatments & payments
    treatments = _count(
        EncounterTreatment, EncounterTreatment.performed_by, EncounterTreatment.performed_at
    )
    payments_rows = db.execute(
        select(Payment.received_by, func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.hospital_id == hospital_id,
            Payment.deleted_at.is_(None),
            Payment.received_at >= start,
            Payment.received_at < end,
        ).group_by(Payment.received_by)
    ).all()
    collected = {uid: amt for uid, amt in payments_rows if uid is not None}

    staff = [
        StaffPerformance(
            user_id=u.id,
            full_name=u.full_name,
            role=m.role.value,
            designation=m.designation,
            patients_registered=0,
            treatments_performed=int(treatments.get(u.id, 0)),
            payments_collected=Decimal(collected.get(u.id, 0)),
        )
        for u, m in members
    ]
    staff.sort(key=lambda s: s.payments_collected, reverse=True)
    return StaffPerformanceReport(
        from_date=from_date.isoformat(), to_date=to_date.isoformat(), staff=staff
    )

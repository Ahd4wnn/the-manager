from decimal import Decimal

from pydantic import BaseModel


class Bucket(BaseModel):
    """One time bucket (a day, week, or month) of money in/out."""

    label: str          # e.g. "2026-07-06", "2026-W27", "2026-07"
    revenue: Decimal    # payments collected in the bucket
    expenses: Decimal
    net: Decimal


class FinancialSummary(BaseModel):
    from_date: str
    to_date: str
    total_revenue: Decimal
    total_expenses: Decimal
    net: Decimal
    invoiced: Decimal          # total invoice value issued
    outstanding: Decimal       # unpaid balance across invoices
    patients: int
    invoices: int
    buckets: list[Bucket]


class StaffPerformance(BaseModel):
    user_id: int
    full_name: str
    role: str
    designation: str | None = None
    patients_registered: int
    treatments_performed: int
    payments_collected: Decimal


class StaffPerformanceReport(BaseModel):
    from_date: str
    to_date: str
    staff: list[StaffPerformance]

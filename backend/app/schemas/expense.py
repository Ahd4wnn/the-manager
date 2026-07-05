from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ExpenseCreate(BaseModel):
    category: str
    amount: Decimal
    spent_on: date
    note: str | None = None


class ExpenseUpdate(BaseModel):
    category: str | None = None
    amount: Decimal | None = None
    spent_on: date | None = None
    note: str | None = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: int
    category: str
    amount: Decimal
    spent_on: date
    note: str | None = None

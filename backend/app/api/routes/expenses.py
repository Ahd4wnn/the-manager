from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_roles
from app.database import get_db
from app.models.enums import Role
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate
from app.utils.audit import log_action

router = APIRouter()

# Expenses are managed by managers/owners.
_MANAGE = require_roles(Role.owner, Role.manager)


def _get(db: Session, hospital_id: int, expense_id: int) -> Expense:
    e = db.get(Expense, expense_id)
    if e is None or e.deleted_at is not None or e.hospital_id != hospital_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    return e


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
) -> Expense:
    expense = Expense(
        hospital_id=ctx.hospital.id,
        created_by=ctx.user.id,
        **payload.model_dump(),
    )
    db.add(expense)
    db.flush()
    log_action(
        db,
        action="expense.create",
        user_id=ctx.user.id,
        hospital_id=ctx.hospital.id,
        entity_type="expense",
        entity_id=expense.id,
        detail=f"{payload.category} {payload.amount}",
    )
    db.commit()
    db.refresh(expense)
    return expense


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
    limit: int = Query(100, le=500),
    offset: int = 0,
) -> list[Expense]:
    stmt = (
        select(Expense)
        .where(Expense.hospital_id == ctx.hospital.id, Expense.deleted_at.is_(None))
        .order_by(Expense.spent_on.desc(), Expense.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt))


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
) -> Expense:
    expense = _get(db, ctx.hospital.id, expense_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
) -> None:
    expense = _get(db, ctx.hospital.id, expense_id)
    expense.deleted_at = datetime.now(timezone.utc)
    db.commit()

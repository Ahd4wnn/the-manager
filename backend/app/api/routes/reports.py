from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from io import BytesIO
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_roles
from app.database import get_db
from app.models.enums import Role
from app.schemas.report import FinancialSummary, StaffPerformanceReport
from app.services.reports import financial_summary, staff_performance
from app.utils.excel import build_financial_workbook

router = APIRouter()

# Financial analysis & reports are owner/manager only.
_MANAGE = require_roles(Role.owner, Role.manager)


def _default_range(from_date: date | None, to_date: date | None) -> tuple[date, date]:
    today = date.today()
    return (from_date or today - timedelta(days=30), to_date or today)


@router.get("/financial", response_model=FinancialSummary)
def financial(
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    granularity: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
) -> FinancialSummary:
    f, t = _default_range(from_date, to_date)
    return financial_summary(db, ctx.hospital.id, f, t, granularity)


@router.get("/staff-performance", response_model=StaffPerformanceReport)
def staff_perf(
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
) -> StaffPerformanceReport:
    f, t = _default_range(from_date, to_date)
    return staff_performance(db, ctx.hospital.id, f, t)


@router.get("/excel")
def excel(
    ctx: TenantContext = Depends(_MANAGE),
    db: Session = Depends(get_db),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    granularity: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
) -> StreamingResponse:
    f, t = _default_range(from_date, to_date)
    data = build_financial_workbook(db, ctx.hospital, f, t, granularity)
    filename = f"{ctx.hospital.code}_report_{f}_{t}.xlsx"
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

from fastapi import APIRouter

from app.api.routes import (
    appointments,
    auth,
    billing,
    expenses,
    hospitals,
    medicines,
    patients,
    reports,
    treatments,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(hospitals.router, prefix="/hospitals", tags=["hospitals"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(
    appointments.router, prefix="/appointments", tags=["appointments"]
)
api_router.include_router(treatments.router, prefix="/treatments", tags=["treatments"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(medicines.router, prefix="/medicines", tags=["medicines"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])

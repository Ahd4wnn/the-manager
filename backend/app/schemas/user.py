from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import Role


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phone: str
    full_name: str
    email: EmailStr | None = None
    is_platform_admin: bool
    is_active: bool


class OwnerCreate(BaseModel):
    """Platform admin creates an owner (optionally attached to a hospital)."""

    phone: str
    full_name: str
    password: str
    email: EmailStr | None = None
    hospital_id: int | None = None


class StaffCreate(BaseModel):
    """Owner/Manager creates a hospital user (manager/staff/doctor)."""

    phone: str
    full_name: str
    password: str
    email: EmailStr | None = None
    role: Role


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    hospital_id: int
    role: Role


class UserWithRole(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phone: str
    full_name: str
    email: EmailStr | None = None
    is_active: bool
    role: Role

from pydantic import BaseModel, ConfigDict, EmailStr


class HospitalBase(BaseModel):
    name: str
    code: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    gstin: str | None = None
    upi_vpa: str | None = None
    upi_payee_name: str | None = None


class HospitalCreate(HospitalBase):
    pass


class HospitalUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    gstin: str | None = None
    upi_vpa: str | None = None
    upi_payee_name: str | None = None
    is_active: bool | None = None


class HospitalOut(HospitalBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool

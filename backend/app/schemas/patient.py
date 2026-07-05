from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import Gender, PatientType


class PatientBase(BaseModel):
    full_name: str
    patient_type: PatientType
    gender: Gender | None = None
    date_of_birth: date | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    blood_group: str | None = None
    allergies: str | None = None
    medical_history: str | None = None
    id_number: str | None = None
    insurance_number: str | None = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: str | None = None
    patient_type: PatientType | None = None
    gender: Gender | None = None
    date_of_birth: date | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    blood_group: str | None = None
    allergies: str | None = None
    medical_history: str | None = None
    id_number: str | None = None
    insurance_number: str | None = None


class PatientOut(PatientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: int
    mrn: str

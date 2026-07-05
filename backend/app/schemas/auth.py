from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    phone: str
    password: str


class MembershipInfo(BaseModel):
    hospital_id: int
    hospital_name: str
    role: str


class Me(BaseModel):
    id: int
    phone: str
    full_name: str
    email: str | None = None
    is_platform_admin: bool
    memberships: list[MembershipInfo] = []

# BMW "The Manager"

A multi-tenant hospital / clinic management system.

- **Backend:** FastAPI + PostgreSQL + SQLAlchemy + Alembic (`/backend`)
- **Admin panel:** React (Vite) web app — same API (`/admin-web`, later)
- **Mobile:** Native Android / Kotlin (`/android`, later)

## Roles
Admin (platform) → Owner → Manager → Staff (→ Doctor, future). Multi-tenant:
an Owner can own multiple hospitals; every record is scoped by `hospital_id`.

## MVP scope (lean core)
Auth/RBAC → hospitals → patients (internal/outside) → bookings → treatments → billing (INR, GST, UPI QR).

## Getting started (backend)

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env          # then edit values

# Start Postgres (Docker):
docker compose up -d db

# Run migrations + seed the platform admin:
alembic upgrade head
python -m app.seed

# Run the API:
uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def log_action(
    db: Session,
    *,
    action: str,
    user_id: int | None = None,
    hospital_id: int | None = None,
    entity_type: str | None = None,
    entity_id: str | int | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        AuditLog(
            action=action,
            user_id=user_id,
            hospital_id=hospital_id,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            detail=detail,
        )
    )

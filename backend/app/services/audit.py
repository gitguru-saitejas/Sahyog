from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from typing import Any, Dict, Optional

def log_audit(
    db: Session,
    user_id: Optional[str],
    action: str,
    table_name: str,
    record_id: str,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLog:
    """Logs database write actions (CREATE, UPDATE, DELETE, RESTORE) for security auditing."""
    # Ensure action is valid
    if action not in ("CREATE", "UPDATE", "DELETE", "RESTORE"):
        raise ValueError(f"Invalid audit action: {action}")
        
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

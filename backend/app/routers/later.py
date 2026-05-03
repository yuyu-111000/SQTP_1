import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_optional_user
from ..db import get_db
from ..models import LaterItem, User
from ..schemas import LaterCreate, LaterOut

router = APIRouter(prefix="/later", tags=["later"])


@router.get("", response_model=List[LaterOut])
def list_later(
    x_client_id: Optional[str] = Header(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if current_user:
        return (
            db.query(LaterItem)
            .filter(LaterItem.client_id == current_user.id)
            .order_by(LaterItem.created_at.desc())
            .all()
        )
    if x_client_id:
        return (
            db.query(LaterItem)
            .filter(LaterItem.client_id == x_client_id)
            .order_by(LaterItem.created_at.desc())
            .all()
        )
    return []


@router.post("", response_model=LaterOut)
def create_later(
    payload: LaterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(LaterItem)
        .filter(
            LaterItem.resource_id == payload.resource_id,
            LaterItem.client_id == current_user.id,
        )
        .first()
    )
    if existing:
        return existing
    item = LaterItem(
        id=f"later_{int(time.time() * 1000)}",
        resource_id=payload.resource_id,
        title=payload.title,
        created_at=int(time.time()),
        client_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{resource_id}")
def delete_later(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(LaterItem)
        .filter(
            LaterItem.resource_id == resource_id,
            LaterItem.client_id == current_user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="later item not found")
    db.delete(item)
    db.commit()
    return {"deleted": True}

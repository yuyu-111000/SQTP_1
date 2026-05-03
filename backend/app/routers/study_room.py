import time
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_optional_user
from ..db import get_db
from ..models import StudyRoomSession, StudyRoomStats, User
from ..schemas import StudyRoomOnlineUser, StudyRoomOut, StudyRoomUpdate

router = APIRouter(prefix="/study-room", tags=["study-room"])

SESSION_TIMEOUT = 5 * 60


def _cleanup_stale_sessions(db: Session):
    cutoff = int(time.time()) - SESSION_TIMEOUT
    db.query(StudyRoomSession).filter(StudyRoomSession.last_heartbeat < cutoff).delete()
    db.commit()


def _get_or_create_stats(db: Session) -> StudyRoomStats:
    stats = db.query(StudyRoomStats).first()
    if not stats:
        stats = StudyRoomStats(current_users=0, peak_today=0, updated_at=int(time.time()))
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats


def _sync_stats(db: Session):
    _cleanup_stale_sessions(db)
    count = db.query(StudyRoomSession).count()
    stats = _get_or_create_stats(db)
    stats.current_users = count
    stats_updated = datetime.fromtimestamp(stats.updated_at or 0)
    now = datetime.fromtimestamp(int(time.time()))
    if stats_updated.date() != now.date():
        stats.peak_today = count
    else:
        stats.peak_today = max(stats.peak_today, count)
    stats.updated_at = int(time.time())
    db.commit()


@router.get("/online", response_model=StudyRoomOut)
def get_online(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    _sync_stats(db)
    stats = _get_or_create_stats(db)
    sessions = db.query(StudyRoomSession).order_by(StudyRoomSession.last_heartbeat.desc()).all()
    now = int(time.time())
    online_users = [
        StudyRoomOnlineUser(
            username=s.username,
            online_minutes=max(0, (now - s.last_heartbeat) // 60),
        )
        for s in sessions
    ]
    return StudyRoomOut(
        currentUsers=stats.current_users,
        peakToday=stats.peak_today,
        online_users=online_users,
    )


@router.post("/heartbeat")
def heartbeat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = int(time.time())
    session = db.query(StudyRoomSession).filter(
        StudyRoomSession.user_id == current_user.id
    ).first()
    if session:
        session.last_heartbeat = now
    else:
        session = StudyRoomSession(
            user_id=current_user.id,
            username=current_user.username,
            last_heartbeat=now,
        )
        db.add(session)
    db.commit()
    _sync_stats(db)
    return {"ok": True, "current_users": _get_or_create_stats(db).current_users}


@router.post("/leave")
def leave(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(StudyRoomSession).filter(
        StudyRoomSession.user_id == current_user.id
    ).delete()
    db.commit()
    _sync_stats(db)
    return {"ok": True}


@router.post("/online", response_model=StudyRoomOut)
def update_online(
    payload: StudyRoomUpdate,
    db: Session = Depends(get_db),
):
    """Legacy endpoint for backward compat."""
    stats = _get_or_create_stats(db)
    stats.current_users = payload.currentUsers
    if payload.currentUsers > stats.peak_today:
        stats.peak_today = payload.currentUsers
    stats.updated_at = int(time.time())
    db.commit()
    return StudyRoomOut(currentUsers=stats.current_users, peakToday=stats.peak_today, online_users=[])

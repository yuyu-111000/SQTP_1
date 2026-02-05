import time

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import StudyRoomStats
from ..schemas import StudyRoomOut, StudyRoomUpdate

router = APIRouter(prefix="/study-room", tags=["study-room"])


def get_stats_row(db: Session) -> StudyRoomStats:
    row = db.query(StudyRoomStats).first()
    if row:
        return row
    row = StudyRoomStats(current_users=0, peak_today=0, updated_at=int(time.time()))
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/online", response_model=StudyRoomOut)
def get_online(db: Session = Depends(get_db)):
    row = get_stats_row(db)
    return {"currentUsers": row.current_users, "peakToday": row.peak_today}


@router.post("/online", response_model=StudyRoomOut)
def update_online(payload: StudyRoomUpdate, db: Session = Depends(get_db)):
    row = get_stats_row(db)
    row.current_users = payload.currentUsers
    if payload.currentUsers > row.peak_today:
        row.peak_today = payload.currentUsers
    row.updated_at = int(time.time())
    db.commit()
    return {"currentUsers": row.current_users, "peakToday": row.peak_today}

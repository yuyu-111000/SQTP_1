import time
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Feedback
from ..schemas import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])

@router.post("", response_model=FeedbackOut)
def create_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    item = Feedback(
        id=f"fb_{int(time.time() * 1000)}",
        content=payload.content,
        created_at=int(time.time()),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("", response_model=List[FeedbackOut])
def list_feedback(db: Session = Depends(get_db)):
    return db.query(Feedback).order_by(Feedback.created_at.desc()).all()
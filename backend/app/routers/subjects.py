import json
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Resource, Subject
from ..schemas import ResourceOut, SubjectOut

router = APIRouter(prefix="/subjects", tags=["subjects"])


def parse_tags(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
        if isinstance(value, list):
            return [str(item) for item in value]
    except json.JSONDecodeError:
        pass
    return [part.strip() for part in raw.split(",") if part.strip()]


@router.get("", response_model=List[SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.name.asc()).all()


@router.get("/{subject_id}/resources", response_model=List[ResourceOut])
def list_resources(subject_id: str, keyword: Optional[str] = None, sort: str = "hot", db: Session = Depends(get_db)):
    query = db.query(Resource).filter(Resource.subject_id == subject_id)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(or_(Resource.title.ilike(like), Resource.description.ilike(like)))
    if sort == "new":
        query = query.order_by(desc(Resource.created_at))
    else:
        query = query.order_by(desc(Resource.like_count + Resource.comment_count * 2))
    items = query.all()
    return [
        ResourceOut(
            id=item.id,
            subject_id=item.subject_id,
            title=item.title,
            url=item.url,
            description=item.description,
            platform=item.platform,
            tags=parse_tags(item.tags),
            created_at=item.created_at,
            like_count=item.like_count,
            comment_count=item.comment_count,
        )
        for item in items
    ]

import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Comment, Resource
from ..schemas import CommentCreate, CommentOut

router = APIRouter(prefix="/resources", tags=["comments"])


@router.get("/{resource_id}/comments", response_model=List[CommentOut])
def list_comments(resource_id: str, db: Session = Depends(get_db)):
    items = (
        db.query(Comment)
        .filter(Comment.resource_id == resource_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [
        CommentOut(
            id=item.id,
            resource_id=item.resource_id,
            user=item.user_name,
            content=item.content,
            likes=item.likes,
            created_at=item.created_at,
        )
        for item in items
    ]


@router.post("/{resource_id}/comments", response_model=CommentOut)
def create_comment(resource_id: str, payload: CommentCreate, db: Session = Depends(get_db)):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="resource not found")
    comment = Comment(
        id=f"c_{int(time.time() * 1000)}",
        resource_id=resource_id,
        user_name=payload.user or "匿名",
        content=payload.content,
        likes=0,
        created_at=int(time.time()),
    )
    db.add(comment)
    resource.comment_count = (resource.comment_count or 0) + 1
    db.commit()
    db.refresh(comment)
    return CommentOut(
        id=comment.id,
        resource_id=comment.resource_id,
        user=comment.user_name,
        content=comment.content,
        likes=comment.likes,
        created_at=comment.created_at,
    )


@router.post("/{resource_id}/likes")
def like_resource(resource_id: str, db: Session = Depends(get_db)):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="resource not found")
    resource.like_count = (resource.like_count or 0) + 1
    db.commit()
    return {"likeCount": resource.like_count}

import json
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session

import time

from ..db import get_db
from ..models import Resource, Subject
from ..schemas import ResourceCreate, ResourceOut, ResourceUpdate, SubjectOut

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
def list_resources(
    subject_id: str,
    keyword: Optional[str] = None,
    sort: str = "hot",
    x_client_id: str = Header(...),
    db: Session = Depends(get_db),
):
    query = db.query(Resource).filter(
        Resource.subject_id == subject_id,
        or_(Resource.client_id == "default", Resource.client_id == x_client_id)
    )
    if keyword:
        terms = [term.strip() for term in keyword.split() if term.strip()]
        conditions = []
        for term in terms:
            like_term = f"%{term}%"
            conditions.append(or_(Resource.title.ilike(like_term), Resource.description.ilike(like_term)))


        query = query.filter(and_(*conditions))
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
            tags=parse_tags(item.tags),
            client_id=item.client_id,
        )
        for item in items
    ]


@router.post("/{subject_id}/resources", response_model=ResourceOut)
def create_private_resource(
    subject_id: str,
    payload: ResourceCreate,
    x_client_id: str = Header(...),
    db: Session = Depends(get_db),
):
    item = Resource(
        id=f"res_{uuid4().hex[:12]}",
        subject_id=subject_id,
        title=payload.title,
        url=payload.url,
        description=payload.description,
        tags=payload.tags,
        created_at=int(time.time() * 1000),
        client_id=x_client_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ResourceOut(
        id=item.id,
        subject_id=item.subject_id,
        title=item.title,
        url=item.url,
        description=item.description,
        tags=parse_tags(item.tags),
        client_id=item.client_id,
    )


@router.patch("/{subject_id}/resources/{resource_id}", response_model=ResourceOut)
def update_private_resource(
    subject_id: str,
    resource_id: str,
    payload: ResourceUpdate,
    x_client_id: str = Header(...),
    db: Session = Depends(get_db),
):
    item = (
        db.query(Resource)
        .filter(Resource.id == resource_id, Resource.subject_id == subject_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="资源不存在")
    if item.client_id != x_client_id:
        raise HTTPException(status_code=403, detail="无权限编辑该资源")

    if payload.title is not None:
        item.title = payload.title
    if payload.url is not None:
        item.url = payload.url
    if payload.description is not None:
        item.description = payload.description
    if payload.tags is not None:
        item.tags = payload.tags

    db.commit()
    db.refresh(item)
    return ResourceOut(
        id=item.id,
        subject_id=item.subject_id,
        title=item.title,
        url=item.url,
        description=item.description,
        tags=parse_tags(item.tags),
        client_id=item.client_id,
    )


@router.delete("/{subject_id}/resources/{resource_id}")
def delete_private_resource(
    subject_id: str,
    resource_id: str,
    x_client_id: str = Header(...),
    db: Session = Depends(get_db),
):
    item = (
        db.query(Resource)
        .filter(Resource.id == resource_id, Resource.subject_id == subject_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="资源不存在")
    if item.client_id != x_client_id:
        raise HTTPException(status_code=403, detail="无权限删除该资源")

    db.delete(item)
    db.commit()
    return {"ok": True}

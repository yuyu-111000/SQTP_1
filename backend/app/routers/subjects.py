import asyncio
import base64
import json
import re
import time
from typing import List, Optional
from urllib.parse import urljoin, urlparse
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session

from ..auth import get_current_admin, get_current_user, get_optional_user
from ..db import get_db
from ..models import Resource, Subject, User
from ..schemas import (
    ResourceCreate,
    ResourceOut,
    ResourceReview,
    ResourceUpdate,
    SubjectOut,
    UrlExtractRequest,
    UrlExtractResponse,
)

from playwright.sync_api import sync_playwright

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


def resource_to_out(item: Resource) -> ResourceOut:
    return ResourceOut(
        id=item.id,
        subject_id=item.subject_id,
        title=item.title,
        url=item.url,
        description=item.description,
        detailed_description=item.detailed_description,
        platform=item.platform,
        tags=parse_tags(item.tags),
        client_id=item.client_id,
        like_count=item.like_count,
        comment_count=item.comment_count,
        status=item.status,
        visibility=item.visibility,
        og_image=item.og_image,
        submitter_id=item.submitter_id,
        created_at=item.created_at,
    )


# ── Read endpoints ──

@router.get("", response_model=List[SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.name.asc()).all()


@router.get("/{subject_id}/resources", response_model=List[ResourceOut])
def list_resources(
    subject_id: str,
    keyword: Optional[str] = None,
    sort: str = "hot",
    x_client_id: Optional[str] = Header(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    # Everyone sees: approved public resources (client_id="default")
    base_filter = and_(Resource.client_id == "default", Resource.status == "approved")

    # Logged-in users also see their own resources (any status/visibility)
    if current_user:
        base_filter = or_(
            base_filter,
            Resource.submitter_id == current_user.id,
        )
    elif x_client_id:
        base_filter = or_(
            base_filter,
            Resource.client_id == x_client_id,
        )

    query = db.query(Resource).filter(Resource.subject_id == subject_id, base_filter)

    if keyword:
        terms = [term.strip() for term in keyword.split() if term.strip()]
        conditions = []
        for term in terms:
            like_term = f"%{term}%"
            conditions.append(
                or_(Resource.title.ilike(like_term), Resource.description.ilike(like_term))
            )
        query = query.filter(and_(*conditions))

    if sort == "new":
        query = query.order_by(desc(Resource.created_at))
    else:
        query = query.order_by(desc(Resource.like_count + Resource.comment_count * 2))

    return [resource_to_out(item) for item in query.all()]


# ── Write endpoints ──

@router.post("/{subject_id}/resources", response_model=ResourceOut)
def create_resource(
    subject_id: str,
    payload: ResourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_admin = bool(current_user.is_admin)

    if is_admin:
        status = "approved"
        client_id = "default"
    elif payload.visibility == "private":
        status = "approved"
        client_id = current_user.id
    else:
        status = "pending"
        client_id = current_user.id

    # Extract og:image from URL
    og_image = None
    try:
        og_image = _extract_og_image(payload.url)
    except Exception:
        pass

    item = Resource(
        id=f"res_{uuid4().hex[:12]}",
        subject_id=subject_id,
        title=payload.title,
        url=payload.url,
        description=payload.description,
        detailed_description=payload.detailed_description,
        platform=payload.platform,
        tags=payload.tags,
        created_at=int(time.time() * 1000),
        status=status,
        visibility=payload.visibility,
        og_image=og_image,
        submitter_id=current_user.id,
        client_id=client_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return resource_to_out(item)


@router.patch("/{subject_id}/resources/{resource_id}", response_model=ResourceOut)
def update_resource(
    subject_id: str,
    resource_id: str,
    payload: ResourceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(Resource)
        .filter(Resource.id == resource_id, Resource.subject_id == subject_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="资源不存在")

    # Admin: only edit client_id="default" resources
    # User: only edit their own resources
    if current_user.is_admin:
        if item.client_id != "default":
            raise HTTPException(status_code=403, detail="管理员只能编辑已发布的公共资源")
    else:
        if item.submitter_id != current_user.id:
            raise HTTPException(status_code=403, detail="只能编辑自己提交的资源")

    if payload.title is not None:
        item.title = payload.title
    if payload.url is not None:
        item.url = payload.url
    if payload.description is not None:
        item.description = payload.description
    if payload.detailed_description is not None:
        item.detailed_description = payload.detailed_description
    if payload.tags is not None:
        item.tags = payload.tags
    if payload.platform is not None:
        item.platform = payload.platform

    db.commit()
    db.refresh(item)
    return resource_to_out(item)


@router.delete("/{subject_id}/resources/{resource_id}")
def delete_resource(
    subject_id: str,
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(Resource)
        .filter(Resource.id == resource_id, Resource.subject_id == subject_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="资源不存在")

    # Admin: only delete client_id="default" resources
    # User: only delete their own resources
    if current_user.is_admin:
        if item.client_id != "default":
            raise HTTPException(status_code=403, detail="管理员只能删除已发布的公共资源")
    else:
        if item.submitter_id != current_user.id:
            raise HTTPException(status_code=403, detail="只能删除自己提交的资源")

    db.delete(item)
    db.commit()
    return {"ok": True}


# ── URL extraction (Playwright) ──

def _extract_og_image(url: str) -> Optional[str]:
    """Quick extraction of og:image without full browser."""
    import httpx
    try:
        with httpx.Client(timeout=6, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200:
                return None
            html = resp.text[:200000]
    except Exception:
        return None
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
    if m:
        img = m.group(1)
        if img.startswith("//"):
            img = "https:" + img
        elif img.startswith("/"):
            img = urljoin(url, img)
        return img
    return None


def _extract_meta(html: str, prop: str) -> Optional[str]:
    """Extract a meta tag value by property or name."""
    for attr in [f'property="{prop}"', f'property=\'{prop}\'', f'name="{prop}"', f'name=\'{prop}\'']:
        m = re.search(
            rf'<meta[^>]+{re.escape(attr)}[^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE
        )
        if m:
            return m.group(1)
    return None


@router.post("/extract-url", response_model=UrlExtractResponse)
def extract_url_meta(
    payload: UrlExtractRequest,
    current_user: User = Depends(get_current_user),
):
    url = payload.url
    title = None
    description = None
    image = None
    favicon = None
    screenshot_b64 = None

    try:
        parsed = urlparse(url)
        favicon = f"{parsed.scheme}://{parsed.netloc}/favicon.ico"
    except Exception:
        pass

    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=20000)

            html = page.content()

            title = _extract_meta(html, "og:title")
            if not title:
                title = _extract_meta(html, "twitter:title")
            if not title:
                m = re.search(r"<title>([^<]+)</title>", html, re.IGNORECASE)
                if m:
                    title = m.group(1).strip()

            description = _extract_meta(html, "og:description")
            if not description:
                description = _extract_meta(html, "description")
            if not description:
                body_text = page.evaluate(
                    "() => document.body ? document.body.innerText.substring(0, 500) : ''"
                )
                if body_text:
                    lines = [l.strip() for l in body_text.split("\n") if len(l.strip()) > 30]
                    description = lines[0][:300] if lines else None

            image = _extract_meta(html, "og:image")
            if image:
                if image.startswith("//"):
                    image = "https:" + image
                elif image.startswith("/"):
                    image = urljoin(url, image)

            screenshot_bytes = page.screenshot(full_page=False)
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"无法提取网页信息: {str(e)}")
    finally:
        if browser:
            browser.close()

    return UrlExtractResponse(
        title=title,
        description=description,
        image=image,
        favicon=favicon,
        screenshot_base64=screenshot_b64,
    )


# ── Admin endpoints ──

admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.get("/pending-resources", response_model=List[ResourceOut])
def list_pending_resources(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Only show public pending resources (exclude private ones)."""
    items = (
        db.query(Resource)
        .filter(Resource.status == "pending", Resource.visibility == "public")
        .order_by(desc(Resource.created_at))
        .all()
    )
    return [resource_to_out(item) for item in items]


@admin_router.post("/resources/{resource_id}/review")
def review_resource(
    resource_id: str,
    payload: ResourceReview,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be approved or rejected")

    item = db.query(Resource).filter(Resource.id == resource_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="资源不存在")

    item.status = payload.status
    if payload.status == "approved":
        item.client_id = "default"
    db.commit()
    return {"ok": True}

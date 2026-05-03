import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..auth import get_current_user, get_optional_user
from ..db import get_db
from ..models import Site, SiteSection, User
from ..schemas import SiteAssign, SiteCreate, SiteOut, SiteSectionCreate, SiteSectionOut, SiteUpdate

router = APIRouter(prefix="/sites", tags=["sites"])

DEFAULT_SECTION_ID = "default"


def ensure_default_section(db: Session) -> SiteSection:
    section = db.query(SiteSection).filter(SiteSection.id == DEFAULT_SECTION_ID).first()
    if section:
        return section
    section = SiteSection(id=DEFAULT_SECTION_ID, name="默认分区")
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.get("/sections", response_model=List[SiteSectionOut])
def list_sections(db: Session = Depends(get_db)):
    return db.query(SiteSection).order_by(SiteSection.name.asc()).all()


@router.post("/sections", response_model=SiteSectionOut)
def create_section(payload: SiteSectionCreate, db: Session = Depends(get_db)):
    section = SiteSection(id=f"sec_{int(time.time() * 1000)}", name=payload.name)
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.patch("/sections/{section_id}", response_model=SiteSectionOut)
def rename_section(section_id: str, payload: SiteSectionCreate, db: Session = Depends(get_db)):
    section = db.query(SiteSection).filter(SiteSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="section not found")
    section.name = payload.name
    db.commit()
    db.refresh(section)
    return section


@router.delete("/sections/{section_id}")
def delete_section(section_id: str, db: Session = Depends(get_db)):
    if section_id == DEFAULT_SECTION_ID:
        raise HTTPException(status_code=400, detail="cannot delete default section")
    section = db.query(SiteSection).filter(SiteSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="section not found")
    default_section = ensure_default_section(db)
    db.query(Site).filter(Site.section_id == section_id).update({Site.section_id: default_section.id})
    db.delete(section)
    db.commit()
    return {"deleted": True}


@router.get("", response_model=List[SiteOut])
def list_sites(
    x_client_id: Optional[str] = Header(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    client_filter = or_(Site.client_id == "default")
    if current_user:
        client_filter = or_(Site.client_id == "default", Site.client_id == current_user.id)
    elif x_client_id:
        client_filter = or_(Site.client_id == "default", Site.client_id == x_client_id)
    return db.query(Site).filter(client_filter).order_by(Site.title.asc()).all()


@router.post("", response_model=SiteOut)
def create_site(
    payload: SiteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    section = db.query(SiteSection).filter(SiteSection.id == payload.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="section not found")
    site = Site(
        id=f"s_{int(time.time() * 1000)}",
        title=payload.title,
        url=payload.url,
        description=payload.description,
        section_id=payload.section_id,
        client_id=current_user.id,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.patch("/{site_id}", response_model=SiteOut)
def update_site(
    site_id: str,
    payload: SiteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = (
        db.query(Site)
        .filter(Site.id == site_id, Site.client_id == current_user.id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=404, detail="site not found or no permission")
    if payload.title is not None:
        site.title = payload.title
    db.commit()
    db.refresh(site)
    return site


@router.patch("/{site_id}/assign", response_model=SiteOut)
def assign_site(
    site_id: str,
    payload: SiteAssign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = (
        db.query(Site)
        .filter(Site.id == site_id, Site.client_id == current_user.id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=404, detail="site not found or no permission")
    section = db.query(SiteSection).filter(SiteSection.id == payload.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="section not found")
    site.section_id = payload.section_id
    db.commit()
    db.refresh(site)
    return site


@router.delete("/{site_id}")
def delete_site(
    site_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = (
        db.query(Site)
        .filter(Site.id == site_id, Site.client_id == current_user.id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=404, detail="site not found or no permission")
    db.delete(site)
    db.commit()
    return {"deleted": True}

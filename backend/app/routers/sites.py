import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Site, SiteSection
from ..schemas import SiteAssign, SiteCreate, SiteOut, SiteSectionCreate, SiteSectionOut

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
def list_sites(db: Session = Depends(get_db)):
    return db.query(Site).order_by(Site.title.asc()).all()


@router.post("", response_model=SiteOut)
def create_site(payload: SiteCreate, db: Session = Depends(get_db)):
    section = db.query(SiteSection).filter(SiteSection.id == payload.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="section not found")
    site = Site(
        id=f"s_{int(time.time() * 1000)}",
        title=payload.title,
        url=payload.url,
        description=payload.description,
        section_id=payload.section_id,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.patch("/{site_id}/assign", response_model=SiteOut)
def assign_site(site_id: str, payload: SiteAssign, db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="site not found")
    section = db.query(SiteSection).filter(SiteSection.id == payload.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="section not found")
    site.section_id = payload.section_id
    db.commit()
    db.refresh(site)
    return site


@router.delete("/{site_id}")
def delete_site(site_id: str, db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="site not found")
    db.delete(site)
    db.commit()
    return {"deleted": True}

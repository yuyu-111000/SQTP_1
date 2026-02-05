import json
import time
from pathlib import Path

from .db import SessionLocal, Base, engine
from .models import Resource, Site, SiteSection, Subject

DEFAULT_SECTION_ID = "default"


def load_source_data() -> dict:
    repo_root = Path(__file__).resolve().parents[2]
    data_path = repo_root / "frontend" / "data" / "data.json"
    return json.loads(data_path.read_text(encoding="utf-8"))


def ensure_default_section(db) -> SiteSection:
    section = db.query(SiteSection).filter(SiteSection.id == DEFAULT_SECTION_ID).first()
    if section:
        return section
    section = SiteSection(id=DEFAULT_SECTION_ID, name="默认分区")
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


def seed_subjects_and_resources(db, payload: dict) -> bool:
    if db.query(Subject).first():
        return False
    now = int(time.time())
    categories = payload.get("studyResourceCategories", [])
    for category in categories:
        subject = Subject(
            id=str(category.get("id")),
            name=category.get("name", ""),
            icon=category.get("icon"),
        )
        db.add(subject)
        resources = category.get("resources", [])
        for item in resources:
            comments = item.get("comments", [])
            like_count = sum(int(comment.get("likes", 0)) for comment in comments)
            resource = Resource(
                id=str(item.get("id")),
                subject_id=str(category.get("id")),
                title=item.get("title", ""),
                url=item.get("url", ""),
                description=item.get("description"),
                platform=item.get("source"),
                tags=json.dumps(item.get("tags", []), ensure_ascii=False),
                created_at=now,
                like_count=like_count,
                comment_count=len(comments),
            )
            db.add(resource)
    db.commit()
    return True


def seed_sites(db, payload: dict) -> bool:
    db.query(Site).delete()
    db.query(SiteSection).delete()
    db.commit()
    section = ensure_default_section(db)
    sites = payload.get("sites", [])
    for item in sites:
        site = Site(
            id=str(item.get("id")),
            title=item.get("title", ""),
            url=item.get("url", ""),
            description=item.get("description"),
            section_id=section.id,
        )
        db.add(site)
    db.commit()
    return True


def run_seed():
    Base.metadata.create_all(bind=engine)
    payload = load_source_data()
    db = SessionLocal()
    try:
        seed_subjects_and_resources(db, payload)
        seed_sites(db, payload)
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()

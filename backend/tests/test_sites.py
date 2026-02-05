from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Site, SiteSection


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_sections_crud():
    reset_db()
    client = TestClient(app)

    response = client.get("/sites/sections")
    assert response.status_code == 200
    assert response.json() == []

    create = client.post("/sites/sections", json={"name": "默认分区"})
    assert create.status_code == 200
    section = create.json()
    assert section["name"] == "默认分区"

    update = client.patch(f"/sites/sections/{section['id']}", json={"name": "学习"})
    assert update.status_code == 200
    assert update.json()["name"] == "学习"

    delete = client.delete(f"/sites/sections/{section['id']}")
    assert delete.status_code == 200
    assert delete.json() == {"deleted": True}


def test_sites_crud_and_assign():
    reset_db()
    client = TestClient(app)

    section = client.post("/sites/sections", json={"name": "默认分区"}).json()

    response = client.post(
        "/sites",
        json={
            "title": "GitHub",
            "url": "https://github.com",
            "description": "代码托管",
            "section_id": section["id"],
        },
    )
    assert response.status_code == 200
    site = response.json()
    assert site["title"] == "GitHub"

    list_resp = client.get("/sites")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    assign = client.patch(f"/sites/{site['id']}/assign", json={"section_id": section["id"]})
    assert assign.status_code == 200
    assert assign.json()["section_id"] == section["id"]

    delete = client.delete(f"/sites/{site['id']}")
    assert delete.status_code == 200
    assert delete.json() == {"deleted": True}


def test_delete_section_moves_sites():
    reset_db()
    db = SessionLocal()
    try:
        default = SiteSection(id="default", name="默认分区")
        other = SiteSection(id="sec1", name="学习")
        site = Site(id="s1", title="CC98", url="https://www.cc98.org/", description="", section_id="sec1")
        db.add_all([default, other, site])
        db.commit()
    finally:
        db.close()

    client = TestClient(app)
    delete = client.delete("/sites/sections/sec1")
    assert delete.status_code == 200

    db = SessionLocal()
    try:
        site = db.query(Site).filter(Site.id == "s1").first()
        assert site.section_id == "default"
    finally:
        db.close()

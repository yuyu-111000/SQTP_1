from fastapi.testclient import TestClient

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import Subject, User
from app.auth import hash_password


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_subject():
    db = SessionLocal()
    subj = Subject(id="cs_base", name="C语言程序设计", icon="😎")
    db.add(subj)
    db.commit()
    db.close()


def seed_admin():
    db = SessionLocal()
    admin = User(id="u_admin", username="admin", password_hash=hash_password("admin123"), is_admin=1)
    db.add(admin)
    db.commit()
    db.close()


def get_token(client, username, password):
    resp = client.post("/auth/login", json={"username": username, "password": password})
    return resp.json()["access_token"]


def test_non_admin_public_resource_is_pending():
    reset_db()
    seed_subject()
    seed_admin()
    client = TestClient(app)

    # Register normal user
    client.post("/auth/register", json={"username": "student", "password": "pass1234"})
    user_token = get_token(client, "student", "pass1234")

    # Create public resource
    resp = client.post(
        "/subjects/cs_base/resources",
        json={"title": "My Resource", "url": "https://example.com", "visibility": "public"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"
    assert data["client_id"] != "default"


def test_non_admin_private_resource_is_approved():
    reset_db()
    seed_subject()
    client = TestClient(app)

    client.post("/auth/register", json={"username": "student2", "password": "pass1234"})
    user_token = get_token(client, "student2", "pass1234")

    resp = client.post(
        "/subjects/cs_base/resources",
        json={"title": "Private Note", "url": "https://example.com", "visibility": "private"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "approved"
    assert data["visibility"] == "private"


def test_admin_create_resource_is_approved():
    reset_db()
    seed_subject()
    seed_admin()
    client = TestClient(app)

    admin_token = get_token(client, "admin", "admin123")

    resp = client.post(
        "/subjects/cs_base/resources",
        json={"title": "Admin Resource", "url": "https://example.com", "visibility": "public"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "approved"
    assert data["client_id"] == "default"


def test_admin_review_flow():
    reset_db()
    seed_subject()
    seed_admin()
    client = TestClient(app)

    # Register user and submit public resource
    client.post("/auth/register", json={"username": "user3", "password": "pass1234"})
    user_token = get_token(client, "user3", "pass1234")

    resp = client.post(
        "/subjects/cs_base/resources",
        json={"title": "Pending Resource", "url": "https://example.com", "visibility": "public"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    resource_id = resp.json()["id"]

    # Admin checks pending
    admin_token = get_token(client, "admin", "admin123")
    pending = client.get("/admin/pending-resources", headers={"Authorization": f"Bearer {admin_token}"})
    assert len(pending.json()) == 1

    # Admin approves
    review = client.post(
        f"/admin/resources/{resource_id}/review",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert review.status_code == 200

    # Pending list should be empty now
    pending = client.get("/admin/pending-resources", headers={"Authorization": f"Bearer {admin_token}"})
    assert len(pending.json()) == 0

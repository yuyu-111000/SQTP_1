from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import User
from app.auth import hash_password


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def get_token(client):
    db = SessionLocal()
    user = User(id="u_test", username="test", password_hash=hash_password("pass"), is_admin=0)
    db.add(user)
    db.commit()
    db.close()
    resp = client.post("/auth/login", json={"username": "test", "password": "pass"})
    return resp.json()["access_token"]


def test_later_crud():
    reset_db()
    client = TestClient(app)
    token = get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/later", headers=headers)
    assert response.status_code == 200
    assert response.json() == []

    create = client.post("/later", json={"resource_id": "r1", "title": "资源"}, headers=headers)
    assert create.status_code == 200
    item = create.json()
    assert item["resource_id"] == "r1"

    response = client.get("/later", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1

    delete = client.delete("/later/r1", headers=headers)
    assert delete.status_code == 200
    assert delete.json() == {"deleted": True}

    response = client.get("/later", headers=headers)
    assert response.status_code == 200
    assert response.json() == []

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


def test_todos_crud():
    reset_db()
    client = TestClient(app)
    token = get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/todos", headers=headers)
    assert response.status_code == 200
    assert response.json() == []

    create = client.post("/todos", json={"text": "学习", "done": False}, headers=headers)
    assert create.status_code == 200
    todo = create.json()
    assert todo["text"] == "学习"
    assert todo["done"] is False

    update = client.patch(f"/todos/{todo['id']}", json={"done": True}, headers=headers)
    assert update.status_code == 200
    assert update.json()["done"] is True

    delete = client.delete(f"/todos/{todo['id']}", headers=headers)
    assert delete.status_code == 200
    assert delete.json() == {"deleted": True}

    response = client.get("/todos", headers=headers)
    assert response.status_code == 200
    assert response.json() == []

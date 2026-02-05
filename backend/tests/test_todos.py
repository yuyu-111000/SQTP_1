from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Todo


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_todos_crud():
    reset_db()
    client = TestClient(app)

    response = client.get("/todos")
    assert response.status_code == 200
    assert response.json() == []

    create = client.post("/todos", json={"text": "学习", "done": False})
    assert create.status_code == 200
    todo = create.json()
    assert todo["text"] == "学习"
    assert todo["done"] is False

    update = client.patch(f"/todos/{todo['id']}", json={"done": True})
    assert update.status_code == 200
    assert update.json()["done"] is True

    delete = client.delete(f"/todos/{todo['id']}")
    assert delete.status_code == 200
    assert delete.json() == {"deleted": True}

    response = client.get("/todos")
    assert response.status_code == 200
    assert response.json() == []

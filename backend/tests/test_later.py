from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import LaterItem


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_later_crud():
    reset_db()
    client = TestClient(app)

    response = client.get("/later")
    assert response.status_code == 200
    assert response.json() == []

    create = client.post("/later", json={"resource_id": "r1", "title": "资源"})
    assert create.status_code == 200
    item = create.json()
    assert item["resource_id"] == "r1"

    response = client.get("/later")
    assert response.status_code == 200
    assert len(response.json()) == 1

    delete = client.delete("/later/r1")
    assert delete.status_code == 200
    assert delete.json() == {"deleted": True}

    response = client.get("/later")
    assert response.status_code == 200
    assert response.json() == []

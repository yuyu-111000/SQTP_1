from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_list_subjects_empty():
    reset_db()
    client = TestClient(app)
    response = client.get("/subjects")
    assert response.status_code == 200
    assert response.json() == []


def test_list_resources_empty():
    reset_db()
    client = TestClient(app)
    response = client.get("/subjects/unknown/resources")
    assert response.status_code == 200
    assert response.json() == []

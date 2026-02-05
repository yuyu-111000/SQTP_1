from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import StudyRoomStats


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_get_stats_default():
    reset_db()
    client = TestClient(app)
    response = client.get("/study-room/online")
    assert response.status_code == 200
    assert response.json() == {"currentUsers": 0, "peakToday": 0}


def test_update_stats():
    reset_db()
    client = TestClient(app)
    response = client.post("/study-room/online", json={"currentUsers": 5})
    assert response.status_code == 200
    assert response.json() == {"currentUsers": 5, "peakToday": 5}

    response = client.post("/study-room/online", json={"currentUsers": 3})
    assert response.status_code == 200
    assert response.json() == {"currentUsers": 3, "peakToday": 5}

from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Comment, Resource, Subject


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_resource():
    db = SessionLocal()
    try:
        subject = Subject(id="cs_base", name="C语言程序设计", icon="💻")
        resource = Resource(
            id="r1",
            subject_id="cs_base",
            title="示例资源",
            url="https://example.com",
            description="desc",
            platform="bilibili",
            tags='["视频"]',
            created_at=1700000000,
            like_count=0,
            comment_count=0,
        )
        db.add(subject)
        db.add(resource)
        db.commit()
    finally:
        db.close()


def test_list_comments_empty():
    reset_db()
    seed_resource()
    client = TestClient(app)
    response = client.get("/resources/r1/comments")
    assert response.status_code == 200
    assert response.json() == []


def test_create_comment_increments_count():
    reset_db()
    seed_resource()
    client = TestClient(app)
    response = client.post(
        "/resources/r1/comments",
        json={"user": "匿名", "content": "很好"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["content"] == "很好"

    db = SessionLocal()
    try:
        resource = db.query(Resource).filter(Resource.id == "r1").first()
        assert resource is not None
        assert resource.comment_count == 1
        comments = db.query(Comment).filter(Comment.resource_id == "r1").all()
        assert len(comments) == 1
    finally:
        db.close()


def test_like_resource():
    reset_db()
    seed_resource()
    client = TestClient(app)
    response = client.post("/resources/r1/likes")
    assert response.status_code == 200
    assert response.json() == {"likeCount": 1}

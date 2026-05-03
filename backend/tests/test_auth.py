from fastapi.testclient import TestClient

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import User
from app.auth import hash_password


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_register():
    reset_db()
    client = TestClient(app)
    resp = client.post("/auth/register", json={"username": "newuser", "password": "secret123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["username"] == "newuser"
    assert data["user"]["is_admin"] is False


def test_register_duplicate():
    reset_db()
    client = TestClient(app)
    client.post("/auth/register", json={"username": "dup", "password": "secret123"})
    resp = client.post("/auth/register", json={"username": "dup", "password": "secret123"})
    assert resp.status_code == 400
    assert "已存在" in resp.json()["detail"]


def test_login():
    reset_db()
    db = SessionLocal()
    user = User(id="u_test", username="tester", password_hash=hash_password("pass1234"), is_admin=0)
    db.add(user)
    db.commit()
    db.close()

    client = TestClient(app)
    resp = client.post("/auth/login", json={"username": "tester", "password": "pass1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["username"] == "tester"


def test_login_wrong_password():
    reset_db()
    db = SessionLocal()
    user = User(id="u_test2", username="tester2", password_hash=hash_password("pass1234"), is_admin=0)
    db.add(user)
    db.commit()
    db.close()

    client = TestClient(app)
    resp = client.post("/auth/login", json={"username": "tester2", "password": "wrong"})
    assert resp.status_code == 401
    assert "密码错误" in resp.json()["detail"]


def test_login_user_not_found():
    reset_db()
    client = TestClient(app)
    resp = client.post("/auth/login", json={"username": "nobody", "password": "x"})
    assert resp.status_code == 404
    assert "用户不存在" in resp.json()["detail"]


def test_me():
    reset_db()
    client = TestClient(app)
    # Register and get token
    reg = client.post("/auth/register", json={"username": "meuser", "password": "secret123"})
    token = reg.json()["access_token"]

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "meuser"


def test_admin_endpoint_requires_admin():
    reset_db()
    client = TestClient(app)
    reg = client.post("/auth/register", json={"username": "normal", "password": "secret123"})
    token = reg.json()["access_token"]

    resp = client.get("/auth/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403

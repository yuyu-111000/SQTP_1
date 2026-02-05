# 最小可用鉴权 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 添加最小可用的注册/登录/JWT 身份认证能力，并提供 /auth/me 接口获取当前用户。

**Architecture:** 使用 Users 表保存账号与加盐哈希密码；登录后签发 JWT（Bearer Token），/auth/me 解析 Token 返回用户信息。保持接口与现有 FastAPI 路由一致，测试优先。

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, python-jose, passlib[bcrypt]

---

### Task 1: 添加依赖

**Files:**
- Modify: `backend/requirements.txt`

**Step 1: 写一个占位测试（确保依赖未安装会失败）**

```python
# backend/tests/test_auth_deps.py
import importlib

def test_auth_deps_available():
    assert importlib.import_module("jose")
    assert importlib.import_module("passlib")
```

**Step 2: 运行测试确认失败**

Run: `pytest backend/tests/test_auth_deps.py -v`
Expected: FAIL (ModuleNotFoundError)

**Step 3: 添加依赖**

在 `backend/requirements.txt` 追加：
```
python-jose
passlib[bcrypt]
```

**Step 4: 运行测试确认通过**

Run: `pytest backend/tests/test_auth_deps.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/requirements.txt backend/tests/test_auth_deps.py
git commit -m "chore(auth): add jwt and password deps"
```

---

### Task 2: 用户模型与 Schema

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`

**Step 1: 写失败测试（User 表与 Schema）**

```python
# backend/tests/test_auth_models.py
from backend.app.models import User


def test_user_model_fields():
    user = User(id="u1", username="alice", password_hash="hash")
    assert user.username == "alice"
```

**Step 2: 运行测试确认失败**

Run: `pytest backend/tests/test_auth_models.py -v`
Expected: FAIL (ImportError: User)

**Step 3: 写最小实现**

- 在 `models.py` 添加 `User` 模型（id, username, password_hash, created_at）。
- 在 `schemas.py` 添加 `UserCreate`, `UserLogin`, `UserOut`。

**Step 4: 运行测试确认通过**

Run: `pytest backend/tests/test_auth_models.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/tests/test_auth_models.py
git commit -m "feat(auth): add user model and schemas"
```

---

### Task 3: 鉴权工具（哈希与 JWT）

**Files:**
- Create: `backend/app/auth.py`
- Test: `backend/tests/test_auth_utils.py`

**Step 1: 写失败测试**

```python
# backend/tests/test_auth_utils.py
from backend.app.auth import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hashing():
    hashed = hash_password("pass123")
    assert verify_password("pass123", hashed)


def test_jwt_roundtrip():
    token = create_access_token({"sub": "u1"})
    payload = decode_access_token(token)
    assert payload["sub"] == "u1"
```

**Step 2: 运行测试确认失败**

Run: `pytest backend/tests/test_auth_utils.py -v`
Expected: FAIL (ImportError)

**Step 3: 写最小实现**

- `hash_password`/`verify_password` 使用 passlib[bcrypt]
- `create_access_token`/`decode_access_token` 使用 python-jose
- 在文件内定义 `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`

**Step 4: 运行测试确认通过**

Run: `pytest backend/tests/test_auth_utils.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/auth.py backend/tests/test_auth_utils.py
git commit -m "feat(auth): add password hashing and jwt utils"
```

---

### Task 4: Auth 路由（注册/登录/我）

**Files:**
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_auth.py`

**Step 1: 写失败测试**

```python
# backend/tests/test_auth.py
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_register_login_me_flow():
    r = client.post("/auth/register", json={"username": "alice", "password": "pass123"})
    assert r.status_code == 200

    r = client.post("/auth/login", json={"username": "alice", "password": "pass123"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == "alice"
```

**Step 2: 运行测试确认失败**

Run: `pytest backend/tests/test_auth.py -v`
Expected: FAIL (404 /auth/*)

**Step 3: 写最小实现**

- `/auth/register`：创建用户（若用户名重复返回 400）
- `/auth/login`：校验密码，签发 token
- `/auth/me`：解析 token，返回当前用户
- 使用 `Depends(get_db)` 与 SQLAlchemy 会话

**Step 4: 运行测试确认通过**

Run: `pytest backend/tests/test_auth.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/routers/auth.py backend/app/main.py backend/tests/test_auth.py
git commit -m "feat(auth): add register login me endpoints"
```

---

### Task 5: 回归测试

**Files:**
- Test: `backend/tests/*`

**Step 1: 运行全量测试**

Run: `pytest backend/tests -v`
Expected: PASS

**Step 2: Commit（如需要）**

```bash
git add backend/tests
git commit -m "test(auth): verify full suite"
```

---

Plan complete and saved to `docs/plans/2026-02-05-最小鉴权-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?

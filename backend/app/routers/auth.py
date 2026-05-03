import time
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    get_current_admin,
    get_current_user,
    hash_password,
    verify_password,
)
from ..db import get_db
from ..models import AdminApplication, User
from ..schemas import (
    AdminApplicationCreate,
    AdminApplicationOut,
    TokenOut,
    UserLogin,
    UserOut,
    UserRegister,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    if len(payload.username) < 2:
        raise HTTPException(status_code=400, detail="用户名至少2个字符")
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="密码至少4个字符")

    user = User(
        id=f"u_{uuid4().hex[:12]}",
        username=payload.username,
        password_hash=hash_password(payload.password),
        is_admin=0,
        created_at=int(time.time()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.username, bool(user.is_admin))
    return TokenOut(
        access_token=token,
        user=UserOut(
            id=user.id,
            username=user.username,
            is_admin=bool(user.is_admin),
            created_at=user.created_at,
        ),
    )


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="密码错误")

    token = create_access_token(user.id, user.username, bool(user.is_admin))
    return TokenOut(
        access_token=token,
        user=UserOut(
            id=user.id,
            username=user.username,
            is_admin=bool(user.is_admin),
            created_at=user.created_at,
        ),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        username=current_user.username,
        is_admin=bool(current_user.is_admin),
        created_at=current_user.created_at,
    )


@router.post("/apply-admin", response_model=AdminApplicationOut)
def apply_admin(
    payload: AdminApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(AdminApplication)
        .filter(
            AdminApplication.user_id == current_user.id,
            AdminApplication.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="你已有一个待处理的申请")

    app = AdminApplication(
        id=f"aa_{uuid4().hex[:12]}",
        user_id=current_user.id,
        reason=payload.reason,
        status="pending",
        created_at=int(time.time()),
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return AdminApplicationOut(
        id=app.id,
        user_id=app.user_id,
        reason=app.reason,
        status=app.status,
        created_at=app.created_at,
    )


@router.get("/admin/applications", response_model=List[AdminApplicationOut])
def list_applications(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(AdminApplication)
        .order_by(AdminApplication.created_at.desc())
        .all()
    )
    result = []
    for a in apps:
        user = db.query(User).filter(User.id == a.user_id).first()
        result.append(
            AdminApplicationOut(
                id=a.id,
                user_id=a.user_id,
                username=user.username if user else a.user_id,
                reason=a.reason,
                status=a.status,
                created_at=a.created_at,
            )
        )
    return result


@router.post("/admin/applications/{app_id}/approve")
def approve_application(
    app_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    app = db.query(AdminApplication).filter(AdminApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="申请不存在")
    app.status = "approved"
    user = db.query(User).filter(User.id == app.user_id).first()
    if user:
        user.is_admin = 1
    db.commit()
    return {"ok": True}


@router.post("/admin/applications/{app_id}/reject")
def reject_application(
    app_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    app = db.query(AdminApplication).filter(AdminApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="申请不存在")
    app.status = "rejected"
    db.commit()
    return {"ok": True}


@router.get("/admin/users", response_model=List[UserOut])
def list_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        UserOut(
            id=u.id,
            username=u.username,
            is_admin=bool(u.is_admin),
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post("/admin/users/{user_id}/promote")
def promote_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.is_admin = 1
    db.commit()
    return {"ok": True}

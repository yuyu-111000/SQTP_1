import time
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_optional_user
from ..db import get_db
from ..models import Todo, User
from ..schemas import TodoCreate, TodoOut, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=List[TodoOut])
def list_todos(
    x_client_id: Optional[str] = Header(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if current_user:
        return (
            db.query(Todo)
            .filter(Todo.client_id == current_user.id)
            .order_by(Todo.created_at.desc())
            .all()
        )
    if x_client_id:
        return (
            db.query(Todo)
            .filter(Todo.client_id == x_client_id)
            .order_by(Todo.created_at.desc())
            .all()
        )
    return []


@router.post("", response_model=TodoOut)
def create_todo(
    payload: TodoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    todo = Todo(
        id=f"todo_{int(time.time() * 1000)}",
        text=payload.text,
        done=1 if payload.done else 0,
        created_at=int(time.time()),
        client_id=current_user.id,
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.patch("/{todo_id}", response_model=TodoOut)
def update_todo(
    todo_id: str,
    payload: TodoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    todo = (
        db.query(Todo)
        .filter(Todo.id == todo_id, Todo.client_id == current_user.id)
        .first()
    )
    if not todo:
        raise HTTPException(status_code=404, detail="todo not found")
    if payload.text is not None:
        todo.text = payload.text
    if payload.done is not None:
        todo.done = 1 if payload.done else 0
    db.commit()
    db.refresh(todo)
    return todo


@router.delete("/{todo_id}")
def delete_todo(
    todo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    todo = (
        db.query(Todo)
        .filter(Todo.id == todo_id, Todo.client_id == current_user.id)
        .first()
    )
    if not todo:
        raise HTTPException(status_code=404, detail="todo not found")
    db.delete(todo)
    db.commit()
    return {"deleted": True}

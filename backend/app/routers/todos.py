import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Todo
from ..schemas import TodoCreate, TodoOut, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=List[TodoOut])
def list_todos(db: Session = Depends(get_db)):
    return db.query(Todo).order_by(Todo.created_at.desc()).all()


@router.post("", response_model=TodoOut)
def create_todo(payload: TodoCreate, db: Session = Depends(get_db)):
    todo = Todo(
        id=f"todo_{int(time.time() * 1000)}",
        text=payload.text,
        done=1 if payload.done else 0,
        created_at=int(time.time()),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.patch("/{todo_id}", response_model=TodoOut)
def update_todo(todo_id: str, payload: TodoUpdate, db: Session = Depends(get_db)):
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
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
def delete_todo(todo_id: str, db: Session = Depends(get_db)):
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="todo not found")
    db.delete(todo)
    db.commit()
    return {"deleted": True}

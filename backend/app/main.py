from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers import admin, auth, comments, later, sites, study_room, subjects, todos, feedback

app = FastAPI(title="ZJU SQTP Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(comments.router)
app.include_router(sites.router)
app.include_router(todos.router)
app.include_router(later.router)
app.include_router(study_room.router)
app.include_router(feedback.router)
app.include_router(subjects.admin_router)
app.include_router(admin.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}

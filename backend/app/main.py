from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers import comments, later, sites, study_room, subjects, todos

app = FastAPI(title="ZJU SQTP Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(subjects.router)
app.include_router(comments.router)
app.include_router(sites.router)
app.include_router(todos.router)
app.include_router(later.router)
app.include_router(study_room.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class SubjectOut(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ResourceOut(BaseModel):
    id: str
    subject_id: str
    title: str
    url: str
    description: Optional[str] = None
    platform: Optional[str] = None
    tags: List[str] = []
    created_at: Optional[int] = None
    like_count: int = 0
    comment_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    user: Optional[str] = None
    content: str


class CommentOut(BaseModel):
    id: str
    resource_id: str
    user: Optional[str] = None
    content: str
    likes: int = 0
    created_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class SiteSectionCreate(BaseModel):
    name: str


class SiteSectionOut(BaseModel):
    id: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class SiteCreate(BaseModel):
    title: str
    url: str
    description: Optional[str] = None
    section_id: str


class SiteOut(BaseModel):
    id: str
    title: str
    url: str
    description: Optional[str] = None
    section_id: str

    model_config = ConfigDict(from_attributes=True)


class SiteAssign(BaseModel):
    section_id: str


class TodoCreate(BaseModel):
    text: str
    done: bool = False


class TodoUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None


class TodoOut(BaseModel):
    id: str
    text: str
    done: bool
    created_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class LaterCreate(BaseModel):
    resource_id: str
    title: str


class LaterOut(BaseModel):
    id: str
    resource_id: str
    title: str
    created_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class StudyRoomUpdate(BaseModel):
    currentUsers: int


class StudyRoomOut(BaseModel):
    currentUsers: int
    peakToday: int

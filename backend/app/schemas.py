from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ── Auth ────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    is_admin: bool
    created_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AdminApplicationCreate(BaseModel):
    reason: Optional[str] = None


class AdminApplicationOut(BaseModel):
    id: str
    user_id: str
    username: Optional[str] = None
    reason: Optional[str] = None
    status: str
    created_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# ── Subjects & Resources ────────────────────────────

class SubjectOut(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
    
class ResourceCreate(BaseModel):
    title: str
    url: str
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    tags: Optional[str] = None
    platform: Optional[str] = None
    visibility: str = "public"  # "public" or "private"


class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    tags: Optional[str] = None
    platform: Optional[str] = None



class ResourceOut(BaseModel):
    id: str
    subject_id: str
    title: str
    url: str
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    platform: Optional[str] = None
    tags: List[str] = []
    client_id: str
    like_count: int = 0
    comment_count: int = 0
    status: str = "approved"
    visibility: str = "public"
    og_image: Optional[str] = None
    submitter_id: Optional[str] = None
    created_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ResourceReview(BaseModel):
    status: str  # "approved" or "rejected"


class UrlExtractRequest(BaseModel):
    url: str


class UrlExtractResponse(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    favicon: Optional[str] = None
    screenshot_base64: Optional[str] = None


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


class SiteUpdate(BaseModel):
    title: Optional[str] = None


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


class StudyRoomOnlineUser(BaseModel):
    username: str
    online_minutes: int


class StudyRoomOut(BaseModel):
    currentUsers: int
    peakToday: int
    online_users: List[StudyRoomOnlineUser] = []

class FeedbackCreate(BaseModel):
    content: str

class FeedbackOut(BaseModel):
    id: str
    content: str
    created_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .db import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=True)

    resources = relationship("Resource", back_populates="subject")


class Resource(Base):
    __tablename__ = "resources"

    id = Column(String, primary_key=True, index=True)
    subject_id = Column(String, ForeignKey("subjects.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    platform = Column(String, nullable=True)
    tags = Column(Text, nullable=True)
    created_at = Column(Integer, nullable=True)
    like_count = Column(Integer, nullable=False, default=0)
    comment_count = Column(Integer, nullable=False, default=0)

    subject = relationship("Subject", back_populates="resources")
    comments = relationship("Comment", back_populates="resource", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, index=True)
    resource_id = Column(String, ForeignKey("resources.id"), index=True, nullable=False)
    user_name = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    likes = Column(Integer, nullable=False, default=0)
    created_at = Column(Integer, nullable=True)

    resource = relationship("Resource", back_populates="comments")


class SiteSection(Base):
    __tablename__ = "site_sections"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)

    sites = relationship("Site", back_populates="section")


class Site(Base):
    __tablename__ = "sites"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    section_id = Column(String, ForeignKey("site_sections.id"), nullable=False)

    section = relationship("SiteSection", back_populates="sites")


class Todo(Base):
    __tablename__ = "todos"

    id = Column(String, primary_key=True, index=True)
    text = Column(String, nullable=False)
    done = Column(Integer, nullable=False, default=0)
    created_at = Column(Integer, nullable=True)


class LaterItem(Base):
    __tablename__ = "later_items"

    id = Column(String, primary_key=True, index=True)
    resource_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    created_at = Column(Integer, nullable=True)


class StudyRoomStats(Base):
    __tablename__ = "study_room_stats"

    id = Column(Integer, primary_key=True, index=True)
    current_users = Column(Integer, nullable=False, default=0)
    peak_today = Column(Integer, nullable=False, default=0)
    updated_at = Column(Integer, nullable=True)

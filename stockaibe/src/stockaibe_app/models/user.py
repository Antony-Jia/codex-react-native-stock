from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    risk_level: Mapped[str] = mapped_column(String(20), default="moderate")
    preferences: Mapped[str | None] = mapped_column(String(255), nullable=True)

    favorites: Mapped[list[FavoriteStock]] = relationship(back_populates="user", cascade="all, delete-orphan")
    alerts: Mapped[list[Alert]] = relationship(back_populates="user", cascade="all, delete-orphan")
    feedbacks: Mapped[list[QAFeedback]] = relationship(back_populates="user", cascade="all, delete-orphan")


class FavoriteStock(Base):
    __tablename__ = "favorite_stocks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    code: Mapped[str] = mapped_column(String(20), index=True)
    alias: Mapped[str | None] = mapped_column(String(50), nullable=True)

    user: Mapped[User] = relationship(back_populates="favorites")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    channel: Mapped[str] = mapped_column(String(20))
    is_enabled: Mapped[bool] = mapped_column(default=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user: Mapped[User] = relationship(back_populates="alerts")


class QAFeedback(Base):
    __tablename__ = "qa_feedbacks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    query: Mapped[str] = mapped_column(String(500))
    response_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_positive: Mapped[bool | None] = mapped_column(default=None)
    extra: Mapped[str | None] = mapped_column(String(500), nullable=True)

    user: Mapped[User | None] = relationship(back_populates="feedbacks")

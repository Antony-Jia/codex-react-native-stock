from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None


class UserBase(BaseModel):
    username: str
    full_name: str | None = None
    risk_level: str = Field(default="moderate")
    preferences: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FavoriteStockRead(BaseModel):
    code: str
    alias: str | None = None


class AlertRead(BaseModel):
    id: int
    channel: str
    is_enabled: bool
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AlertUpdate(BaseModel):
    is_enabled: bool | None = None
    description: str | None = None


class FeedbackCreate(BaseModel):
    query: str
    response_summary: str | None = None
    is_positive: bool | None = None
    extra: str | None = None

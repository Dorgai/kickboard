from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WaitlistCreate(BaseModel):
    email: str = Field(max_length=255)
    name: str | None = Field(default=None, max_length=120)
    message: str | None = Field(default=None, max_length=2000)

    @field_validator("email")
    @classmethod
    def email_must_look_valid(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or "." not in email.rsplit("@", maxsplit=1)[-1]:
            raise ValueError("Enter a valid email address.")
        return email

    @field_validator("name", "message")
    @classmethod
    def blank_strings_become_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class WaitlistEntryRead(BaseModel):
    id: int
    email: str
    name: str | None
    message: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WaitlistSummary(BaseModel):
    count: int

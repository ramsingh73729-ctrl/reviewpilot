from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class Severity(StrEnum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class ReviewRequest(BaseModel):
    repository: str = Field(min_length=1, max_length=255)
    pull_request_number: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=500)
    diff: str = Field(min_length=1, max_length=200_000)


class GithubPRRequest(BaseModel):
    pr_url: str = Field(min_length=1, max_length=500)


class Finding(BaseModel):
    id: str
    severity: Severity
    category: str
    title: str
    explanation: str
    suggestion: str
    line: int | None = None


class ReviewResponse(BaseModel):
    id: str
    repository: str
    pull_request_number: int
    title: str
    status: str
    score: int = Field(ge=0, le=100)
    summary: str
    findings: list[Finding]
    changed_files: int
    additions: int
    deletions: int
    created_at: datetime

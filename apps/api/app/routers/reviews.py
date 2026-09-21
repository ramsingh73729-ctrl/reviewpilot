from urllib.parse import urlparse
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Review
from ..review_engine import review_diff
from ..schemas import GithubPRRequest, ReviewHistoryItem, ReviewRequest, ReviewResponse

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])

PR_PATH = re.compile(r"^/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+)/pull/(?P<number>[1-9][0-9]*)/?$")


def parse_github_pr_url(pr_url: str) -> tuple[str, str, int]:
    parsed = urlparse(pr_url)
    if parsed.scheme != "https" or parsed.netloc.lower() not in {"github.com", "www.github.com"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Use a valid https://github.com pull-request URL.")
    match = PR_PATH.match(parsed.path)
    if not match:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="URL must look like https://github.com/owner/repository/pull/123.")
    return match.group("owner"), match.group("repo"), int(match.group("number"))


async def fetch_github_diff(owner: str, repository: str, number: int) -> str:
    diff_url = f"https://github.com/{owner}/{repository}/pull/{number}.diff"
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.get(diff_url, headers={"Accept": "text/plain", "User-Agent": "ReviewPilot/0.1"})
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="GitHub could not be reached right now.") from exc
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Pull request not found or not publicly accessible.")
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"GitHub returned HTTP {response.status_code}.")
    diff = response.text
    if not diff.strip():
        raise HTTPException(status_code=422, detail="This pull request has no readable diff.")
    if len(diff) > 200_000:
        raise HTTPException(status_code=413, detail="Diff is larger than the current 200 KB review limit.")
    return diff


def persist_review(db: Session, result: ReviewResponse) -> None:
    db.add(Review(
        repository=result.repository,
        pull_request_number=result.pull_request_number,
        title=result.title,
        status=result.status,
        summary=result.summary,
        created_at=result.created_at,
    ))
    db.commit()


@router.post("/preview", response_model=ReviewResponse)
def preview_review(payload: ReviewRequest, db: Session = Depends(get_db)) -> ReviewResponse:
    result = review_diff(payload)
    persist_review(db, result)
    return result


@router.post("/from-github", response_model=ReviewResponse)
async def review_github_pr(payload: GithubPRRequest, db: Session = Depends(get_db)) -> ReviewResponse:
    owner, repository, number = parse_github_pr_url(payload.pr_url)
    diff = await fetch_github_diff(owner, repository, number)
    result = review_diff(ReviewRequest(
        repository=f"{owner}/{repository}",
        pull_request_number=number,
        title=f"Pull request #{number}",
        diff=diff,
    ))
    persist_review(db, result)
    return result


@router.get("/history", response_model=list[ReviewHistoryItem])
def review_history(db: Session = Depends(get_db)) -> list[ReviewHistoryItem]:
    records = db.query(Review).order_by(desc(Review.created_at)).limit(10).all()
    return [ReviewHistoryItem.model_validate(record, from_attributes=True) for record in records]


@router.get("/demo", response_model=ReviewResponse)
def demo_review() -> ReviewResponse:
    return review_diff(ReviewRequest(
        repository="acme/checkout",
        pull_request_number=184,
        title="Harden checkout validation",
        diff="""+++ b/checkout.py\n+def total(items):\n+    try:\n+        return sum(item.price for item in items)\n+    except Exception:\n+        return 0\n""",
    ))

import hashlib
import hmac

from fastapi import APIRouter, Header, HTTPException, Request, status

from ..config import get_settings
from ..database import SessionLocal
from ..routers.reviews import fetch_github_diff, parse_github_pr_url, persist_review
from ..review_engine import review_diff
from ..schemas import ReviewRequest, WebhookResponse

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


def verify_github_signature(body: bytes, signature: str | None, secret: str | None) -> bool:
    if not signature or not secret or not signature.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github", response_model=WebhookResponse)
async def github_webhook(
    request: Request,
    x_github_event: str | None = Header(default=None),
    x_hub_signature_256: str | None = Header(default=None),
) -> WebhookResponse:
    settings = get_settings()
    body = await request.body()
    if not verify_github_signature(body, x_hub_signature_256, settings.github_webhook_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid GitHub webhook signature.")
    if x_github_event != "pull_request":
        return WebhookResponse(accepted=True, action=x_github_event or "unknown", message="Event ignored.")

    payload = await request.json()
    action = payload.get("action", "unknown")
    if action not in {"opened", "reopened", "synchronize"}:
        return WebhookResponse(accepted=True, action=action, message="Pull-request action ignored.")
    pr = payload.get("pull_request") or {}
    pr_url = pr.get("html_url")
    if not pr_url:
        raise HTTPException(status_code=422, detail="Webhook payload is missing pull_request.html_url.")
    owner, repository, number = parse_github_pr_url(pr_url)
    diff = await fetch_github_diff(owner, repository, number)
    result = review_diff(ReviewRequest(
        repository=f"{owner}/{repository}",
        pull_request_number=number,
        title=pr.get("title", f"Pull request #{number}"),
        diff=diff,
    ))
    db = SessionLocal()
    try:
        persist_review(db, result)
    finally:
        db.close()
    return WebhookResponse(accepted=True, action=action, review_id=result.id, message="Pull request reviewed successfully.")

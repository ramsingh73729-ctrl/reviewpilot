from fastapi import APIRouter

from ..review_engine import review_diff
from ..schemas import ReviewRequest, ReviewResponse

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])


@router.post("/preview", response_model=ReviewResponse)
def preview_review(payload: ReviewRequest) -> ReviewResponse:
    return review_diff(payload)


@router.get("/demo", response_model=ReviewResponse)
def demo_review() -> ReviewResponse:
    return review_diff(ReviewRequest(
        repository="acme/checkout",
        pull_request_number=184,
        title="Harden checkout validation",
        diff="""+++ b/checkout.py\n+def total(items):\n+    try:\n+        return sum(item.price for item in items)\n+    except Exception:\n+        return 0\n""",
    ))

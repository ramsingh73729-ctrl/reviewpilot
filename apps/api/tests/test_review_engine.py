from app.review_engine import review_diff
from app.schemas import ReviewRequest, Severity


def test_flags_secrets_as_critical() -> None:
    result = review_diff(ReviewRequest(
        repository="demo/app",
        pull_request_number=1,
        title="Add client",
        diff="+++ b/client.py\n+api_key = 'hard-coded-secret'",
    ))
    assert result.findings[0].severity == Severity.critical
    assert result.score < 100


def test_clean_diff_is_ready() -> None:
    result = review_diff(ReviewRequest(
        repository="demo/app",
        pull_request_number=2,
        title="Add total",
        diff="+++ b/cart.py\n+return sum(item.price for item in items)",
    ))
    assert result.findings == []
    assert result.score == 100

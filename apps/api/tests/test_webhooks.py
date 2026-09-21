import hashlib
import hmac

from app.routers.webhooks import verify_github_signature


def test_github_signature_verification() -> None:
    body = b'{"action":"opened"}'
    secret = "test-secret"
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert verify_github_signature(body, f"sha256={digest}", secret)
    assert not verify_github_signature(body, "sha256=wrong", secret)
    assert not verify_github_signature(body, None, secret)

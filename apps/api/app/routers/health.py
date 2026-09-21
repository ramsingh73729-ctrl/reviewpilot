from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["system"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "reviewpilot-api"}

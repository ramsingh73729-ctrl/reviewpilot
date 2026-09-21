from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .routers import health, reviews

settings = get_settings()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ReviewPilot API",
    version="0.1.0",
    description="AI-assisted pull-request review and issue triage.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(reviews.router)

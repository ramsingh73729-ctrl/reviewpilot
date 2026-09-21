from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./reviewpilot.db"
    redis_url: str = "redis://localhost:6379/0"
    openai_api_key: str | None = None
    ai_model: str = "gpt-4.1-mini"
    ai_provider: str = "mock"
    web_origin: str = "http://localhost:3000"
    github_webhook_secret: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

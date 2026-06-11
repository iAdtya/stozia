"""Application settings loaded from the .env file."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchor the .env to this file's folder so it loads no matter the working dir.
ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")


settings = Settings()

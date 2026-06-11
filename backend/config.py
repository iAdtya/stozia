import os
from pathlib import Path

from dotenv import load_dotenv

# Anchor the .env to this file's folder so it loads no matter the working dir.
ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_FILE)


class Settings:
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

    def __init__(self):
        if not self.DATABASE_URL:
            raise RuntimeError(
                f"DATABASE_URL is not set. Create {ENV_FILE} (see .env.example)."
            )


settings = Settings()

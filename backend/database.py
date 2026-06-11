"""Database engine, session factory, and connection helpers."""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

# pool_pre_ping avoids "server closed the connection" errors on idle pooled
# connections (common with hosted Postgres like Supabase).
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection() -> str:
    """Run a trivial query to confirm the database is reachable.

    Returns the host it connected to. Raises on failure.
    """
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return engine.url.host

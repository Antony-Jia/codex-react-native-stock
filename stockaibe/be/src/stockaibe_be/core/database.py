from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlmodel import Session, create_engine

from .config import settings


# Create engine with PostgreSQL optimizations
engine = create_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=10,  # Connection pool size
    max_overflow=20,  # Max overflow connections
)


def get_session() -> Session:
    """Get a new database session."""
    return Session(engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    """Context manager for database sessions with automatic commit/rollback."""
    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

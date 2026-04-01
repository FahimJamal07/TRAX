"""
database.py — TRAX Core Database Configuration
================================================
Establishes the SQLAlchemy engine, session factory, and declarative base
for the entire application. All other modules import from here.

Usage:
    from backend.database import Base, get_db
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ---------------------------------------------------------------------------
# DATABASE URL
# ---------------------------------------------------------------------------
# SQLite stores the database as a local file in the project root.
# The three slashes (///) denote a relative path from where the server runs.
DATABASE_URL = "sqlite:///./trax_network.db"

# ---------------------------------------------------------------------------
# ENGINE
# ---------------------------------------------------------------------------
# check_same_thread=False is required for SQLite when multiple threads
# (e.g., FastAPI's async workers) share the same connection. This is safe
# here because SQLAlchemy's session-per-request pattern handles thread safety.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    # Echo SQL statements to stdout for development visibility.
    # Set to False in production.
    echo=False,
)

# ---------------------------------------------------------------------------
# SESSION FACTORY
# ---------------------------------------------------------------------------
# autocommit=False  → We control commits explicitly (good practice).
# autoflush=False   → Prevents premature writes before we're ready to commit.
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ---------------------------------------------------------------------------
# DECLARATIVE BASE
# ---------------------------------------------------------------------------
# All ORM model classes will inherit from this Base. It holds the registry
# of all mapped tables and is used by metadata.create_all() in seed.py.
Base = declarative_base()


# ---------------------------------------------------------------------------
# DEPENDENCY: get_db
# ---------------------------------------------------------------------------
def get_db():
    """
    FastAPI dependency that yields a database session for the duration of
    a single request, then guarantees the session is closed afterwards —
    even if an exception is raised mid-request.

    Inject into any route with:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

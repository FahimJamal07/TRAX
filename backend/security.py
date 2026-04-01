"""
security.py — TRAX Authentication & Authorization
===================================================
Centralises all JWT and password logic so main.py stays clean.

Exports (consumed by main.py):
    pwd_context         — CryptContext for bcrypt hashing / verification.
    oauth2_scheme       — OAuth2PasswordBearer for extracting Bearer tokens.
    get_password_hash   — Hash a plaintext password before storing.
    verify_password     — Compare plaintext against a stored bcrypt hash.
    create_access_token — Mint a signed JWT with an expiry claim (includes role).
    get_current_user    — FastAPI dependency: decode token → return User ORM object.
    require_admin       — FastAPI dependency: 403 unless role == "admin".
    require_controller  — FastAPI dependency: 403 unless role is admin or controller.
"""

from datetime import datetime, timedelta, timezone
import logging
import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

try:
    from .database import get_db
    from .models import User
except ImportError:
    from database import get_db
    from models import User

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
# Read auth settings from environment for deployment safety.
# Dev fallback keeps local startup friction-free, but logs a warning.
SECRET_KEY = os.getenv("TRAX_SECRET_KEY", "trax-dev-insecure-change-me")
ALGORITHM = os.getenv("TRAX_JWT_ALGORITHM", "HS256")
try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("TRAX_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
except ValueError:
    ACCESS_TOKEN_EXPIRE_MINUTES = 60

if SECRET_KEY == "trax-dev-insecure-change-me":
    logging.warning(
        "Using fallback TRAX_SECRET_KEY. Set TRAX_SECRET_KEY in environment before deployment."
    )

# ---------------------------------------------------------------------------
# PASSWORD HASHING
# ---------------------------------------------------------------------------
# CryptContext handles bcrypt work-factor selection and future scheme migration
# automatically (deprecated="auto" re-hashes old entries on next login).
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches the stored *hashed_password*."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Return a bcrypt hash of *password* suitable for database storage."""
    return pwd_context.hash(password)


# ---------------------------------------------------------------------------
# JWT HELPERS
# ---------------------------------------------------------------------------
def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Encode *data* as a signed JWT.

    Parameters
    ----------
    data          : Payload dict — must include ``"sub"`` (username) and
                    ``"role"`` keys.  If ``"role"`` is missing it defaults to
                    ``"viewer"`` (lowest privilege) so the token is never
                    accidentally over-privileged.
    expires_delta : Optional custom TTL; defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns
    -------
    str
        A compact, URL-safe JWT string.
    """
    to_encode = data.copy()

    # Defensive role guard — ensures role is always present in the payload
    # even if the caller forgot to include it.  Falls back to the lowest
    # privilege level so an omission is never a security escalation.
    if "role" not in to_encode:
        to_encode["role"] = "viewer"

    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# OAUTH2 SCHEME
# ---------------------------------------------------------------------------
# Points FastAPI's OpenAPI UI to the token endpoint so the "Authorize" button
# works correctly in /docs.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/token")


# ---------------------------------------------------------------------------
# DEPENDENCY: get_current_user
# ---------------------------------------------------------------------------
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that:
      1. Extracts the Bearer token from the Authorization header.
      2. Decodes and validates the JWT signature + expiry.
      3. Extracts the ``sub`` (username) claim from the payload.
      4. Fetches the full SQLAlchemy User ORM object from the database.
         — The DB is the authoritative source of the role; the token role
           is used only as a quick sanity-check layer.
      5. Raises HTTP 401 if any step fails.

    Inject into a route with:
        current_user: User = Depends(get_current_user)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")  # type: ignore[assignment]
        if username is None:
            raise credentials_exception
        # Extract role from token for future audit-logging use; the DB copy
        # is what the RBAC dependencies actually enforce.
        _token_role: str = payload.get("role", "viewer")  # noqa: F841
    except InvalidTokenError:
        raise credentials_exception

    # Always re-query the DB so revoked accounts or role changes take
    # effect immediately on the next request without waiting for token expiry.
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception

    return user


# ---------------------------------------------------------------------------
# ROLE-BASED ACCESS CONTROL DEPENDENCIES
# ---------------------------------------------------------------------------
# IMPORTANT: Each dependency raises a *new* HTTPException instance per call.
# Sharing a single pre-built exception object (_FORBIDDEN singleton) can
# cause subtle cross-request state issues in certain ASGI middleware stacks,
# particularly when exception handlers mutate the exception object.
# ---------------------------------------------------------------------------


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency — passes only when the authenticated user has role
    ``'admin'`` as stored in the **database** (not just the token).
    Raises HTTP 403 Forbidden for any other role.

    Usage:
        current_user: User = Depends(require_admin)
        # or as a route-level guard:
        dependencies=[Depends(require_admin)]
    """
    role = str(current_user.role)
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required. You do not have permission to perform this action.",
        )
    return current_user


def require_controller(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency — passes when the DB role is ``'admin'`` OR
    ``'controller'``.  Raises HTTP 403 Forbidden for viewers or any other role.

    Usage:
        current_user: User = Depends(require_controller)
    """
    role = str(current_user.role)
    if role not in ("admin", "controller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Controller or Admin access required. You do not have permission to perform this action.",
        )
    return current_user

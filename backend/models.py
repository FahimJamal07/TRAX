"""
models.py — TRAX ORM Table Definitions
========================================
Defines the SQLAlchemy ORM models that map directly to SQLite tables.

Tables:
    trains    — Master registry of every train in the network.
    schedules — Timetable entries linking a train to its positional state.

Priority Encoding (stored as Integer for efficient solver comparison):
    High   → 10
    Medium →  5
    Low    →  1
"""

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Float,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

try:
    from .database import Base
except ImportError:
    from database import Base


# ---------------------------------------------------------------------------
# TRACK MODEL
# ---------------------------------------------------------------------------
class Track(Base):
    """
    Physical track definition, representing parallel tracks within a section.

    Columns
    -------
    id               : Unique identifier (e.g., 'A-B-1').
    section_id       : The logical section this track belongs to (e.g., 'A-B').
                       Indexed for fast lookup.
    lane             : Integer representing parallel lane index (e.g., 1 or 2).
    track_type       : Classification label (e.g., 'mainline', 'loop', 'siding').
    source_node      : Directed-graph start vertex for this segment.
    target_node      : Directed-graph end vertex for this segment.
    length_meters    : Physical segment length used for traversal-time calculations.
    speed_limit_kmh  : Segment speed cap used by the optimizer.
    is_bidirectional : True when the segment can be traversed both directions.
    """

    __tablename__ = "tracks"

    id = Column(String, primary_key=True, index=True, nullable=False)
    section_id = Column(String, index=True, nullable=False)
    lane = Column(Integer, nullable=False)
    track_type = Column(String, nullable=False, default="mainline")
    source_node = Column(String, index=True, nullable=False)
    target_node = Column(String, index=True, nullable=False)
    length_meters = Column(Float, nullable=False)
    speed_limit_kmh = Column(Float, nullable=False)
    is_bidirectional = Column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return (
            f"<Track id={self.id!r} section={self.section_id!r} lane={self.lane} "
            f"type={self.track_type!r} source={self.source_node!r} "
            f"target={self.target_node!r} vmax={self.speed_limit_kmh}kmh>"
        )


# ---------------------------------------------------------------------------
# TRAIN MODEL
# ---------------------------------------------------------------------------
class Train(Base):
    """
    Master record for a single train unit in the TRAX network.

    Columns
    -------
    id          : Public train identifier shown in the React UI (e.g., "EXP101").
    type        : Service category — "Express", "Passenger", "Freight", or "Mail".
    priority    : Scheduling weight as an integer (High=10, Medium=5, Low=1).
                  The CP-SAT optimizer uses this directly when minimising tardiness.
    source      : Origin city / station name.
    destination : Terminal city / station name.
    status      : Current operational state. Defaults to "On Time".
    scheduled_departure : ISO-8601 departure timestamp used by time-aware planning.
    speed_multiplier    : Relative traversal factor (lower means faster).
    """

    __tablename__ = "trains"

    # Primary key — business identifier; never auto-incremented so we can use
    # the same IDs the React frontend already expects (EXP101, FRG311, etc.).
    id = Column(String, primary_key=True, index=True, nullable=False)

    # Service type displayed as a badge in the UI.
    type = Column(String, nullable=False)

    # Integer weight consumed by the optimizer. Stored as int rather than
    # a string enum so we can pass it directly to OR-Tools without conversion.
    priority = Column(Integer, nullable=False)

    # Route endpoints shown in the Train Schedule table.
    source = Column(String, nullable=False)
    destination = Column(String, nullable=False)

    # Operational status — can be updated by simulation runs.
    status = Column(String, nullable=False, default="On Time")

    # Planned departure timestamp stored as an ISO-8601 string for SQLite simplicity.
    scheduled_departure = Column(String, nullable=True)

    # Physics parameter used by the optimizer to represent traversal speed.
    speed_multiplier = Column(Float, nullable=False, default=1.0)

    # One-to-many: a single train can have multiple schedule entries
    # (e.g., one per day or one per section).
    schedules = relationship(
        "Schedule",
        back_populates="train",
        cascade="all, delete-orphan",  # Deleting a train clears its schedule.
    )

    def __repr__(self) -> str:
        return f"<Train id={self.id!r} type={self.type!r} priority={self.priority}>"


# ---------------------------------------------------------------------------
# SCHEDULE MODEL (TIMETABLE)
# ---------------------------------------------------------------------------
class Schedule(Base):
    """
    A single timetable entry linking a train to a station at a specific time.

    One Train → Many Schedules (e.g., one entry per section traversal).

    Columns
    -------
    id                : Auto-incremented surrogate key.
    train_id          : FK → trains.id — which train this entry belongs to.
    current_station   : The station name where the train currently sits.
    scheduled_arrival : Minutes from hour 0 (midnight). E.g., 10:00 = 600.
    delay_minutes     : Minutes of delay accumulated at this entry (default 0).
    is_conflict       : True when the solver detects a track conflict here.
    arrival_time      : ISO-8601 arrival timestamp for real-world planning.
    departure_time    : ISO-8601 departure timestamp for real-world planning.
    """

    __tablename__ = "schedules"

    # Surrogate primary key — keeps FK joins simple.
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign key — cascade deletion is handled on the Train side via relationship.
    train_id = Column(
        String,
        ForeignKey("trains.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Index for fast lookups by train.
    )

    # Physical position on the network at the time of this record.
    current_station = Column(String, nullable=False)

    # Scheduled arrival expressed as minutes past midnight (integer arithmetic
    # is solver-friendly and avoids datetime timezone complexity for a prototype).
    scheduled_arrival = Column(Integer, nullable=False, default=0)

    # Delay injected or computed by the optimizer.
    delay_minutes = Column(Integer, nullable=False, default=0)

    # Time-aware schedule stamps stored as ISO-8601 strings.
    arrival_time = Column(String, nullable=True)
    departure_time = Column(String, nullable=True)

    # Flag set by the conflict-detection logic in the optimizer.
    is_conflict = Column(Boolean, nullable=False, default=False)

    # Optional ForeignKey to the track chosen by the routing solver.
    track_id = Column(String, ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True)

    # Many-to-one back-reference to the parent Train record.
    train = relationship("Train", back_populates="schedules")

    # Many-to-one relationship to the assigned track (if any).
    track = relationship("Track")

    def __repr__(self) -> str:
        return (
            f"<Schedule id={self.id} train_id={self.train_id!r} "
            f"station={self.current_station!r} delay={self.delay_minutes}m>"
        )


# ---------------------------------------------------------------------------
# USER MODEL (Authentication)
# ---------------------------------------------------------------------------
class User(Base):
    """
    Stores operator credentials for JWT-based authentication.

    Columns
    -------
    id              : Auto-incremented surrogate key.
    username        : Unique login name — indexed for fast lookup at token issuance.
    hashed_password : bcrypt hash produced by passlib; the plaintext is never stored.
    role            : Access tier, defaults to "controller". Reserved for future RBAC.
    """

    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username        = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role            = Column(String, nullable=False, default="controller")

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r} role={self.role!r}>"

"""
seed.py — TRAX Database Initialisation & Data Injection Script
===============================================================
Run this script ONCE (or whenever you need to reset the database) from the
project root to:
    1. Create all tables defined in models.py (idempotent via create_all).
    2. Wipe any existing Train / Schedule rows cleanly.
    3. Insert the canonical train roster that the React frontend expects.

Usage (from d:\\TRAX):
    python -m backend.seed

The script exits with a non-zero status code on database errors so CI
pipelines can detect failures automatically.
"""

import sys

from sqlalchemy.exc import SQLAlchemyError

# ---------------------------------------------------------------------------
# Local imports — run from the project root so Python resolves the package.
# ---------------------------------------------------------------------------
from backend.database import Base, SessionLocal, engine
from backend.models import Schedule, Track, Train, User  # noqa: F401  (imported for Base registry)
from backend.security import get_password_hash

# ---------------------------------------------------------------------------
# PRIORITY CONSTANTS
# These match the integer encoding described in models.py and are used
# directly by the CP-SAT optimizer as scheduling weights.
# ---------------------------------------------------------------------------
HIGH = 10
MEDIUM = 5
LOW = 1

# ---------------------------------------------------------------------------
# SEED DATA
# Exactly mirrors the dummyData.js used by the React frontend so that any
# future API endpoints return data the UI already knows how to render.
#
# Schema: (id, type, priority, source, destination, status, current_station,
#          scheduled_arrival_mins)
#
# scheduled_arrival is stored as minutes-from-midnight (integer):
#   10:00 → 600,  10:20 → 620,  09:30 → 570,  etc.
# ---------------------------------------------------------------------------
TRAINS_SEED = [
    # id       type         priority  source       destination  status      station       sched_mins
    ("EXP101", "Express",   HIGH,     "Station A", "Station E", "Delayed",  "Station A",  600),
    ("PSS202", "Passenger", MEDIUM,   "Station B", "Station C", "On Time",  "Station B",  620),
    ("FRG311", "Freight",   LOW,      "Station A", "Station E", "Waiting",  "Station A",  570),
    ("EXP412", "Express",   HIGH,     "Station C", "Station E", "Delayed",  "Station C",  610),
    ("MEM513", "Mail",      MEDIUM,   "Station A", "Station B", "On Time",  "Station A",  630),
    ("T-601",  "Passenger", LOW,      "Station C", "Station D", "Waiting",  "Station C",  590),
    ("T-702",  "Express",   HIGH,     "Station B", "Station E", "Moving",   "Station B",  645),
    ("T-803",  "Freight",   LOW,      "Station D", "Station E", "Delayed",  "Station D",  480),
]

# Initial delay values (minutes) matching the frontend dummyData.js.
INITIAL_DELAYS = {
    "EXP101": 15,
    "PSS202": 5,
    "FRG311": 30,
    "EXP412": 10,
    "MEM513": 0,
    "T-601":  7,
    "T-702":  0,
    "T-803":  20,
}


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _create_tables() -> None:
    """Create all tables declared in Base.metadata (no-op if they already exist)."""
    print("[seed] Creating tables from ORM metadata...")
    Base.metadata.create_all(bind=engine)
    print("[seed] ✓ Tables ready.")


def _wipe_existing_data(db) -> None:
    """
    Delete all rows from schedules first (FK child), then trains (FK parent),
    and finally tracks. Using ORM delete keeps cascade logic consistent.
    """
    print("[seed] Wiping existing data...")
    deleted_schedules = db.query(Schedule).delete()
    deleted_trains    = db.query(Train).delete()
    deleted_tracks    = db.query(Track).delete()
    db.commit()
    print(f"[seed] ✓ Removed {deleted_schedules} schedule(s), {deleted_trains} train(s), and {deleted_tracks} track(s).")


def _inject_tracks(db) -> None:
    """Inject the physical track topology with a Single Line Bottleneck at B-C."""
    print("[seed] Injecting physical track topology...")
    tracks = [
        # Section A-B
        Track(id="A-B-M", section_id="A-B", lane=1, track_type="mainline"),
        Track(id="A-B-L1", section_id="A-B", lane=2, track_type="loop"),
        Track(id="A-B-L2", section_id="A-B", lane=3, track_type="loop"),
        
        # Section B-C
        Track(id="B-C-M", section_id="B-C", lane=1, track_type="mainline"),
        Track(id="B-C-L1", section_id="B-C", lane=2, track_type="loop"),
        Track(id="B-C-L2", section_id="B-C", lane=3, track_type="loop"),
        
        # Section C-D
        Track(id="C-D-M", section_id="C-D", lane=1, track_type="mainline"),
        Track(id="C-D-L1", section_id="C-D", lane=2, track_type="loop"),
        Track(id="C-D-L2", section_id="C-D", lane=3, track_type="loop"),
        
        # Section D-E
        Track(id="D-E-M", section_id="D-E", lane=1, track_type="mainline"),
        Track(id="D-E-L1", section_id="D-E", lane=2, track_type="loop"),
        Track(id="D-E-L2", section_id="D-E", lane=3, track_type="loop"),
    ]
    db.bulk_save_objects(tracks)
    db.commit()
    print(f"[seed] ✓ Inserted {len(tracks)} track(s) topology.")


def _inject_trains(db) -> None:
    """Build Train and Schedule ORM objects, bulk-insert, and commit."""
    print("[seed] Injecting canonical train roster...")

    train_objects    = []
    schedule_objects = []

    for (
        train_id, train_type, priority,
        source, destination, status,
        current_station, scheduled_arrival
    ) in TRAINS_SEED:

        # --- Train master record ---
        train_objects.append(
            Train(
                id          = train_id,
                type        = train_type,
                priority    = priority,
                source      = source,
                destination = destination,
                status      = status,
            )
        )

        # --- Initial schedule entry for this train ---
        schedule_objects.append(
            Schedule(
                train_id          = train_id,
                current_station   = current_station,
                scheduled_arrival = scheduled_arrival,
                delay_minutes     = INITIAL_DELAYS.get(train_id, 0),
                is_conflict       = False,
            )
        )

    # Bulk-add for efficiency — one round trip per model list.
    db.bulk_save_objects(train_objects)
    db.bulk_save_objects(schedule_objects)
    db.commit()

    print(f"[seed] ✓ Inserted {len(train_objects)} train(s) "
          f"and {len(schedule_objects)} schedule entry/entries.")


# ---------------------------------------------------------------------------
# ADMIN USER INJECTION
# ---------------------------------------------------------------------------

def _inject_admin_user(db) -> None:
    """
    Insert the default admin user if one does not already exist.
    Idempotent — safe to call on repeated seed runs.
    """
    existing = db.query(User).filter(User.username == "admin").first()
    if existing:
        print("[seed] ✓ Admin user already exists — skipping insertion.")
        return

    admin = User(
        username        = "admin",
        hashed_password = get_password_hash("trax2026"),
        role            = "admin",
    )
    db.add(admin)
    db.commit()
    print("[seed] ✓ Admin user created (username=admin, role=admin).")


# ---------------------------------------------------------------------------
# VERIFICATION QUERY
# ---------------------------------------------------------------------------

def _verify(db) -> None:
    """Read back the seeded rows and print a summary for quick sanity-check."""
    trains = db.query(Train).all()
    print("\n[seed] ─── Verification ─────────────────────────────────────────")
    print(f"{'ID':<10} {'Type':<12} {'Priority':<10} {'Source':<10} {'Dest':<12} Status")
    print("─" * 64)
    for t in trains:
        print(
            f"{t.id:<10} {t.type:<12} {t.priority:<10} "
            f"{t.source:<10} {t.destination:<12} {t.status}"
        )
    print("─" * 64)
    print(f"[seed] Total trains in DB: {len(trains)}\n")


# ---------------------------------------------------------------------------
# MAIN ENTRY POINT
# ---------------------------------------------------------------------------

def main() -> None:
    """Orchestrate table creation, data wipe, injection, and verification."""
    print("\n╔══════════════════════════════════════╗")
    print("║   TRAX — Database Seed Script        ║")
    print("╚══════════════════════════════════════╝\n")

    _create_tables()

    db = SessionLocal()
    try:
        _wipe_existing_data(db)
        _inject_tracks(db)
        _inject_trains(db)
        _inject_admin_user(db)
        _verify(db)
        print("[seed] ✅ Database seeded successfully. Ready to serve API requests.\n")
    except SQLAlchemyError as exc:
        db.rollback()
        print(f"[seed] ❌ Database error — rolled back. Details:\n  {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

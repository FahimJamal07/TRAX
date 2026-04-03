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
from datetime import datetime, timedelta

from sqlalchemy import inspect, text
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
#          departure_offset_mins, travel_duration_mins)
#
# Trains are staggered by 5-10 minutes to create realistic initial traffic.
# ---------------------------------------------------------------------------
TRAINS_SEED = [
    # id       type         priority  source       destination  status      station       depart+mins  trip+mins
    ("EXP101", "Express",   HIGH,     "Station A", "Station E", "Delayed",  "Station A",  0,          22),
    ("PSS202", "Passenger", MEDIUM,   "Station B", "Station C", "On Time",  "Station B",  6,          28),
    ("FRG311", "Freight",   LOW,      "Station A", "Station E", "Waiting",  "Station A",  13,         40),
    ("EXP412", "Express",   HIGH,     "Station C", "Station E", "Delayed",  "Station C",  19,         21),
    ("MEM513", "Mail",      MEDIUM,   "Station A", "Station B", "On Time",  "Station A",  26,         26),
    ("T-601",  "Passenger", LOW,      "Station C", "Station D", "Waiting",  "Station C",  34,         30),
    ("T-702",  "Express",   HIGH,     "Station B", "Station E", "Moving",   "Station B",  43,         20),
    ("T-803",  "Freight",   LOW,      "Station D", "Station E", "Delayed",  "Station D",  51,         42),
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

SPEED_MULTIPLIERS = {
    "Express": 1.0,
    "Passenger": 1.5,
    "Freight": 2.0,
    "Mail": 1.7,
}

BASE_SERVICE_TIME = datetime(2026, 4, 2, 10, 0, 0)


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _create_tables() -> None:
    """Create all tables declared in Base.metadata (no-op if they already exist)."""
    print("[seed] Creating tables from ORM metadata...")
    Base.metadata.create_all(bind=engine)
    print("[seed] ✓ Tables ready.")


def _ensure_schema_columns(db) -> None:
    """Add any missing time-aware columns to existing SQLite tables."""
    inspector = inspect(engine)

    train_columns = {column["name"] for column in inspector.get_columns("trains")}
    schedule_columns = {column["name"] for column in inspector.get_columns("schedules")}

    statements = []
    if "scheduled_departure" not in train_columns:
        statements.append("ALTER TABLE trains ADD COLUMN scheduled_departure VARCHAR")
    if "speed_multiplier" not in train_columns:
        statements.append("ALTER TABLE trains ADD COLUMN speed_multiplier FLOAT NOT NULL DEFAULT 1.0")
    if "arrival_time" not in schedule_columns:
        statements.append("ALTER TABLE schedules ADD COLUMN arrival_time VARCHAR")
    if "departure_time" not in schedule_columns:
        statements.append("ALTER TABLE schedules ADD COLUMN departure_time VARCHAR")

    if not statements:
        return

    print("[seed] Upgrading existing schema with new timing columns...")
    for statement in statements:
        db.execute(text(statement))
    db.commit()
    print("[seed] ✓ Schema upgrade complete.")


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
    """Inject the physical track topology with explicit graph nodes and physics constraints."""
    print("[seed] Injecting physical track topology and physics bounds...")
    tracks = [
        # --- SECTION A-B (15 km) ---
        # Fast mainline, bidirectional.
        Track(id="A-B-M", section_id="A-B", source_node="Station A", target_node="Station B", 
              lane=1, track_type="mainline", length_meters=15000.0, speed_limit_kmh=130.0, is_bidirectional=True),
        # Loop line siding. Longer physical path, massive turnout penalty (40 km/h).
        Track(id="A-B-L1", section_id="A-B", source_node="Station A", target_node="Station B", 
              lane=2, track_type="loop", length_meters=15500.0, speed_limit_kmh=40.0, is_bidirectional=False),
        
        # --- SECTION B-C: THE BOTTLENECK (10 km) ---
        # Single track. No loops. The solver must resolve spatial conflicts by waiting at stations.
        Track(id="B-C-M", section_id="B-C", source_node="Station B", target_node="Station C", 
              lane=1, track_type="mainline", length_meters=10000.0, speed_limit_kmh=100.0, is_bidirectional=True),
        
        # --- SECTION C-D (20 km) ---
        Track(id="C-D-M", section_id="C-D", source_node="Station C", target_node="Station D", 
              lane=1, track_type="mainline", length_meters=20000.0, speed_limit_kmh=130.0, is_bidirectional=True),
        Track(id="C-D-L1", section_id="C-D", source_node="Station C", target_node="Station D", 
              lane=2, track_type="loop", length_meters=20500.0, speed_limit_kmh=40.0, is_bidirectional=False),
        Track(id="C-D-L2", section_id="C-D", source_node="Station C", target_node="Station D", 
              lane=3, track_type="loop", length_meters=20500.0, speed_limit_kmh=40.0, is_bidirectional=False),
        
        # --- SECTION D-E (12 km) ---
        Track(id="D-E-M", section_id="D-E", source_node="Station D", target_node="Station E", 
              lane=1, track_type="mainline", length_meters=12000.0, speed_limit_kmh=130.0, is_bidirectional=True),
        Track(id="D-E-L1", section_id="D-E", source_node="Station D", target_node="Station E", 
              lane=2, track_type="loop", length_meters=12500.0, speed_limit_kmh=40.0, is_bidirectional=False),
    ]
    db.bulk_save_objects(tracks)
    db.commit()
    print(f"[seed] ✓ Inserted {len(tracks)} track(s) topology.")
    
def _inject_trains(db) -> None:
    """Build Train and Schedule ORM objects, bulk-insert, and commit."""
    print("[seed] Injecting canonical train roster...")

    train_objects    = []
    schedule_objects = []
    speed_lookup     = SPEED_MULTIPLIERS

    for (
        train_id, train_type, priority,
        source, destination, status,
        current_station, departure_offset_mins, travel_duration_mins
    ) in TRAINS_SEED:

        scheduled_departure_dt = BASE_SERVICE_TIME + timedelta(minutes=departure_offset_mins)
        arrival_dt = scheduled_departure_dt + timedelta(minutes=travel_duration_mins)
        speed_multiplier = speed_lookup.get(train_type, 1.5)

        # --- Train master record ---
        train_objects.append(
            Train(
                id                 = train_id,
                type               = train_type,
                priority           = priority,
                source             = source,
                destination        = destination,
                status             = status,
                scheduled_departure = scheduled_departure_dt.isoformat(timespec="seconds"),
                speed_multiplier   = speed_multiplier,
            )
        )

        # --- Initial schedule entry for this train ---
        schedule_objects.append(
            Schedule(
                train_id          = train_id,
                current_station   = current_station,
                scheduled_arrival = arrival_dt.hour * 60 + arrival_dt.minute,
                arrival_time      = arrival_dt.isoformat(timespec="seconds"),
                departure_time    = scheduled_departure_dt.isoformat(timespec="seconds"),
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
    print(
        f"{'ID':<10} {'Type':<12} {'Priority':<10} {'Source':<10} {'Dest':<12} "
        f"{'Departure':<20} {'Speed':<7} {'Arrive':<20} {'Depart':<20} Status"
    )
    print("─" * 130)
    for t in trains:
        schedule = t.schedules[0] if t.schedules else None
        print(
            f"{t.id:<10} {t.type:<12} {t.priority:<10} "
            f"{t.source:<10} {t.destination:<12} "
            f"{(t.scheduled_departure or 'None'):<20} {t.speed_multiplier:<7.1f} "
            f"{(schedule.arrival_time if schedule else 'None'):<20} "
            f"{(schedule.departure_time if schedule else 'None'):<20} {t.status}"
        )
    print("─" * 130)
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
        _ensure_schema_columns(db)
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

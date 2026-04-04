from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Any
from pydantic import BaseModel
from sqlalchemy.orm import Session

# --- TRAX backend layer ---
try:
    from .database import get_db
    from .models import Schedule, Track, Train, User
    from .optimizer import optimize_network
    from .security import (
        create_access_token,
        get_current_user,
        get_password_hash,
        require_admin,
        require_controller,
        verify_password,
    )
except ImportError:
    from database import get_db
    from models import Schedule, Track, Train, User
    from optimizer import optimize_network
    from security import (
        create_access_token,
        get_current_user,
        get_password_hash,
        require_admin,
        require_controller,
        verify_password,
    )

app = FastAPI(title="TRAX Core Optimization Engine")


def _parse_iso_datetime(value: object) -> datetime | None:
    """Parse ISO datetime values safely from DB text fields."""
    if value is None:
        return None
    text_value = str(value).strip()
    if not text_value or text_value.lower() == "none":
        return None
    try:
        return datetime.fromisoformat(text_value)
    except ValueError:
        return None


def _format_ampm(dt: datetime | None) -> str | None:
    """Return a frontend-friendly 12-hour time string."""
    if not dt:
        return None
    return dt.strftime("%I:%M %p")

# 1. CORS POLICY: This allows your local React app (usually port 3000 or 5173) to talk to this Python server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. THE INPUT SCHEMA: This matches the "Add Delay to Train" box on your React Dashboard
class ScenarioRequest(BaseModel):
    express_injected_delay: int
    freight_injected_delay: int
    priority_train_id: str | None = None
    secondary_train_id: str | None = None
    optimization_mode: str = "minimize_delay"
    headway_time: int = 5
    solver_timeout: int = 30
    express_weight: int = 10  # Default fallback
    passenger_weight: int = 5
    freight_weight: int = 1   # Default fallback
    # Physical track blockages injected by the Simulation UI.
    track_blockages: list[dict] = []
    # Dynamic capacity constraint changes for stations.
    capacity_changes: list[dict] = []

class TrainCreate(BaseModel):
    id: str
    type: str
    priority: str
    source: str
    destination: str
    time: str  # HH:MM form



# ---------------------------------------------------------------------------
# REGISTRATION SCHEMA
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    """Incoming payload for POST /api/v1/register."""
    username: str
    password: str
    role: str = "viewer"  # Default to lowest privilege


# ---------------------------------------------------------------------------
# 3. POST /api/v1/register — User Registration
# ---------------------------------------------------------------------------
@app.post("/api/v1/register", status_code=201)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new user account.

    - Rejects the request with **HTTP 400** if the username is already taken.
    - Hashes the plaintext password with bcrypt before persisting.
    - Returns a success envelope on creation (HTTP 201).
    """
    # ── Duplicate check ────────────────────────────────────────────────────────
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # ── Hash password and persist ──────────────────────────────────────────────
    new_user = User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        role=user.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"status": "success", "message": "User created successfully."}


# ---------------------------------------------------------------------------
# 4. POST /api/v1/token — Login & Token Issuance
# ---------------------------------------------------------------------------
@app.post("/api/v1/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    OAuth2-compatible login endpoint.

    Accepts form fields ``username`` and ``password`` (application/x-www-form-urlencoded).
    Verifies credentials against the ``users`` table and returns a signed JWT on success.

    Returns
    -------
    {"access_token": "<jwt>", "token_type": "bearer"}
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, str(user.hashed_password)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.username), "role": str(user.role)})
    return {"access_token": access_token, "token_type": "bearer", "role": str(user.role)}


# 5. THE ENDPOINT: React hits this URL when the controller clicks "Re-Optimize"
#    The Pydantic schema and route URL are unchanged — the frontend has no idea
#    that the engine underneath just became fully dynamic.
@app.post("/api/v1/optimize")
def run_optimization(
    scenario: ScenarioRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller),
):
    """
    Orchestrates a full N-train re-optimisation cycle:
      1. Reads live train + schedule state from SQLite.
      2. Maps the UI's express/freight knobs to concrete train IDs.
      3. Calls the CP-SAT engine via optimize_network(), including any track blockages.
      4. Persists the new delay values back to the schedules table.
      5. Returns a JSON payload that Simulation.jsx already knows how to parse.
    """

    # ── Step 1: Load live network state from the database ─────────────────────
    # We join Train + Schedule so the optimizer gets both the priority weight
    # (needed for the objective function) and the current delay (the base time).
    db_trains = db.query(Train).all()
    time_zero_dt = datetime.now().replace(second=0, microsecond=0)

    trains_data: list[dict] = []
    for train_obj in db_trains:
        t: Any = train_obj
        # Use the first schedule entry; fall back to zeroes if missing.
        schedule: Any = t.schedules[0] if t.schedules else None
        scheduled_departure_in_minutes = 0
        if t.scheduled_departure is not None and str(t.scheduled_departure).strip() != "":
            try:
                departure_dt = datetime.fromisoformat(str(t.scheduled_departure))
                scheduled_departure_in_minutes = max(
                    0,
                    int((departure_dt - time_zero_dt).total_seconds() // 60),
                )
            except ValueError:
                scheduled_departure_in_minutes = 0
        trains_data.append({
            "id":          t.id,
            "type":        str(t.type).strip() if t.type is not None else "",
            "priority":    t.priority,                             # int weight for solver
            "source":      t.source,
            "destination": t.destination,
            "scheduled_departure": t.scheduled_departure,
            "scheduled_departure_in_minutes": scheduled_departure_in_minutes,
            "speed_multiplier":    t.speed_multiplier,
            "delay":       schedule.delay_minutes if schedule else 0,   # existing DB delay
        })

    # ── Step 2: Map UI knobs → concrete train IDs ────────────────────────────
    # The frontend can now target any live train ID from the simulation dropdowns.
    # Fall back to legacy IDs when explicit selections are not provided.
    priority_train_id = str(scenario.priority_train_id or "EXP101").strip()
    secondary_train_id = str(scenario.secondary_train_id or "FRG311").strip()
    injected_delays: dict[str, int] = {
        priority_train_id: scenario.express_injected_delay,
    }
    if secondary_train_id and secondary_train_id != priority_train_id:
        injected_delays[secondary_train_id] = scenario.freight_injected_delay

    # ── Step 2.5: Fetch physical track topology ──────────────────────────────
    db_tracks = db.query(Track).all()
    tracks_data = [
        {
            "id": tr.id,
            "section_id": tr.section_id,
            "lane": tr.lane,
            "track_type": str(tr.track_type or "").strip(),
        }
        for tr in db_tracks
    ]

    # ── Step 3: Run the dynamic N-train CP-SAT engine ────────────────────────
    # We now pass both the raw trains and the physical track network, alongside
    # any blockages or dynamic capacity limits requested by the frontend.
    new_schedule = optimize_network(
        trains_data=trains_data,
        tracks_data=tracks_data,
        injected_delays=injected_delays,
        optimization_mode=scenario.optimization_mode,
        headway_time=scenario.headway_time,
        solver_timeout=scenario.solver_timeout,
        express_weight=scenario.express_weight,
        passenger_weight=scenario.passenger_weight,
        freight_weight=scenario.freight_weight,
        track_blockages=scenario.track_blockages,
        capacity_changes=scenario.capacity_changes,
        time_zero_iso=time_zero_dt.isoformat(timespec="seconds"),
    )

    # Propagate solver failures cleanly to the frontend error banner.
    if "status" in new_schedule and new_schedule["status"] == "failed":
        return {
            "status": "failed",
            "message": new_schedule.get("message", "Solver returned no solution."),
        }

    solved_map = new_schedule.get("solution", {})
    live_schedule = new_schedule.get("live_schedule", {})
    kpi_summary = new_schedule.get("kpi_summary", {})

    # ── Step 4: Persist results → schedules table ────────────────────────────
    # For every train the solver touched, update its delay_minutes in SQLite
    # so subsequent GET /api/v1/trains calls reflect the post-optimisation state.
    for train_id, result in solved_map.items():
        schedule_row = (
            db.query(Schedule)
            .filter(Schedule.train_id == train_id)
            .first()
        )
        if schedule_row:
            schedule_row.delay_minutes = result["total_delay_mins"]
            schedule_row.track_id = result.get("track_id")

    db.commit()   # Single commit for the entire optimisation run (atomic).

    # ── Step 5: Return strict KPI payload consumed by frontend analytics ─────
    return {
        "live_schedule": live_schedule,
        "kpi_summary": kpi_summary,
    }


# 4. GET /api/v1/trains — Live Train Roster from SQLite
# ---------------------------------------------------------------------------
# Returns all trains joined with their latest schedule entry. The response
# shape matches exactly what dummyData.js produced so the React components
# (TrainList, Dashboard table) work without any frontend changes.
@app.get("/api/v1/trains")
async def get_trains(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Query every Train row and left-join its most recent Schedule entry.

    Response shape (list):
    {
        "id":              "EXP101",
        "type":            "Express",
        "priority":        10,
        "source":          "Delhi",
        "destination":     "Kanpur",
        "current_station": "Station A",
        "delay":           15,
        "status":          "Delayed"
    }
    """
    # Fetch all trains. The `schedules` relationship is already loaded lazily
    # by SQLAlchemy when we access t.schedules below.
    trains = db.query(Train).all()

    result = []
    for train_obj in trains:
        t: Any = train_obj
        # Pick the first (and typically only) schedule entry for this train.
        # If somehow a train has no schedule row yet, we fall back to safe defaults.
        schedule: Any = t.schedules[0] if t.schedules else None

        scheduled_departure_dt = _parse_iso_datetime(t.scheduled_departure)
        schedule_arrival_dt = _parse_iso_datetime(schedule.arrival_time) if schedule else None
        schedule_departure_dt = _parse_iso_datetime(schedule.departure_time) if schedule else None

        delay_mins = int(schedule.delay_minutes) if schedule else 0
        expected_destination_arrival_dt = (
            schedule_arrival_dt + timedelta(minutes=delay_mins)
            if schedule_arrival_dt else None
        )

        schedule_payload = []
        if schedule:
            schedule_payload.append({
                "current_station": schedule.current_station,
                "arrival_time": _format_ampm(schedule_arrival_dt),
                "departure_time": _format_ampm(schedule_departure_dt),
                "track_id": schedule.track_id,
                "delay_minutes": delay_mins,
            })

        result.append({
            "id":              t.id,
            "type":            t.type,
            "priority":        t.priority,           # Integer weight (10 / 5 / 1)
            "source":          t.source,
            "destination":     t.destination,
            "scheduled_departure": scheduled_departure_dt.isoformat(timespec="seconds") if scheduled_departure_dt else None,
            "expected_destination_arrival": expected_destination_arrival_dt.isoformat(timespec="seconds") if expected_destination_arrival_dt else None,
            "current_station": schedule.current_station   if schedule else "Unknown",
            "delay":           delay_mins,
            "status":          t.status,
            "track_id":        schedule.track_id          if schedule else None,
            "schedule":        schedule_payload,
        })

    return result


# ---------------------------------------------------------------------------
# 5. POST /api/v1/trains — Inject a New Train into the Network
# ---------------------------------------------------------------------------
@app.post("/api/v1/trains")
def add_new_train(
    new_train: TrainCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_controller),
):
    """
    1. Parse "HH:MM" time text into minutes from midnight.
    2. Convert textual priority ("High", "Medium", "Low") to CP-SAT integer weight.
    3. Insert new train and initial timetable entry into SQLite.
    4. Force a fresh run of the optimiser to integrate the injected train.
    """
    # ── Map text values to engine primitives ─────────────────────────────────
    time_zero_dt = datetime.now().replace(second=0, microsecond=0)
    try:
        hrs, mins = map(int, new_train.time.split(":"))
        scheduled_departure_dt = datetime.now().replace(hour=hrs, minute=mins, second=0, microsecond=0)
    except ValueError:
        scheduled_departure_dt = datetime.now().replace(hour=12, minute=0, second=0, microsecond=0)

    priority_map = {"High": 10, "Medium": 5, "Low": 1}
    priority_level = priority_map.get(new_train.priority, 1)
    speed_map = {"Express": 1.0, "Passenger": 1.5, "Freight": 2.0}
    duration_map = {"Express": 22, "Passenger": 30, "Freight": 42, "Mail": 26}
    speed_multiplier = speed_map.get(new_train.type, 1.5)
    travel_duration_mins = duration_map.get(new_train.type, 30)
    arrival_dt = scheduled_departure_dt + timedelta(minutes=travel_duration_mins)
    scheduled_arrival = arrival_dt.hour * 60 + arrival_dt.minute
    scheduled_departure_in_minutes = max(0, int((scheduled_departure_dt - time_zero_dt).total_seconds() // 60))

    existing = db.query(Train).filter(Train.id == new_train.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Train ID {new_train.id} is already in the system.",
        )

    # ── Insert raw train to database ─────────────────────────────────────────
    train_record = Train(
        id=new_train.id,
        type=new_train.type,
        priority=priority_level,
        source=new_train.source,
        destination=new_train.destination,
        status="On Time",
        scheduled_departure=scheduled_departure_dt.isoformat(timespec="seconds"),
        speed_multiplier=speed_multiplier,
    )
    db.add(train_record)
    
    # We must construct its starting timetable record
    schedule_record = Schedule(
        train_id=new_train.id,
        current_station=new_train.source,
        scheduled_arrival=scheduled_arrival,
        arrival_time=arrival_dt.isoformat(timespec="seconds"),
        departure_time=scheduled_departure_dt.isoformat(timespec="seconds"),
        delay_minutes=0,
        is_conflict=False,
        track_id=None,
    )
    db.add(schedule_record)
    
    # Commit the insertion before firing the solver so it can read the updated roster
    db.commit()

    # ── Re-optimize the entire network with the injected train ───────────────
    # Re-fetch all trains including the new one
    db_trains = db.query(Train).all()
    trains_data: list[dict] = []
    for train_obj in db_trains:
        t: Any = train_obj
        schedule: Any = t.schedules[0] if t.schedules else None
        trains_data.append({
            "id":          t.id,
            "type":        str(t.type).strip() if t.type is not None else "",
            "priority":    t.priority,
            "source":      t.source,
            "destination": t.destination,
            "scheduled_departure": t.scheduled_departure,
            "scheduled_departure_in_minutes": (
                max(0, int((datetime.fromisoformat(str(t.scheduled_departure)) - time_zero_dt).total_seconds() // 60))
                if (t.scheduled_departure is not None and str(t.scheduled_departure).strip() != "")
                else 0
            ),
            "speed_multiplier":    t.speed_multiplier,
            "delay":       schedule.delay_minutes if schedule else 0,
        })
    
    db_tracks = db.query(Track).all()
    tracks_data = [
        {
            "id": tr.id,
            "section_id": tr.section_id,
            "lane": tr.lane,
            "track_type": str(tr.track_type or "").strip(),
        }
        for tr in db_tracks
    ]
    
    new_schedule = optimize_network(
        trains_data=trains_data,
        tracks_data=tracks_data,
        injected_delays={},  # No extra delays, just base optimization for the new network size
        optimization_mode="minimize_delay",
        headway_time=5,
        solver_timeout=30,
        express_weight=10,
        passenger_weight=5,
        freight_weight=1,
        track_blockages=[],
        capacity_changes=[],
        time_zero_iso=time_zero_dt.isoformat(timespec="seconds"),
    )

    if "status" in new_schedule and new_schedule["status"] == "failed":
        # The solver couldn't route the new train; we leave it inserted but flagged.
        return {
            "status": "failed",
            "message": new_schedule.get("message", "Network capacity exceeded. Could not route new train."),
        }

    solved_map = new_schedule.get("solution", {})

    # Persist the re-optimized network delays back to SQLite
    for train_id, result_data in solved_map.items():
        sched_row = db.query(Schedule).filter(Schedule.train_id == train_id).first()
        if sched_row:
            sched_row.delay_minutes = result_data["total_delay_mins"]
            sched_row.track_id = result_data.get("track_id")
    
    db.commit()

    # Echo back the success payload (Simulation.jsx listens to this)
    return {
        "status": "success",
        "message": f"Train {new_train.id} successfully integrated. Network Re-Optimized.",
        "live_schedule": new_schedule.get("live_schedule", {}),
        "kpi_summary": new_schedule.get("kpi_summary", {}),
    }


# ---------------------------------------------------------------------------
# 6. POST /api/v1/reset — Surgical Database Reset
# ---------------------------------------------------------------------------
# Zeros out all simulated delays and restores every train to "On Time".
# Called by the Settings page "Clear Simulation Data" button.
@app.post("/api/v1/reset", dependencies=[Depends(require_admin)])
def reset_network(
    db: Session = Depends(get_db),
):
    """
    Reset the network to its clean baseline state without touching table schema:
      • Sets every Schedule.delay_minutes  → 0
      • Sets every Train.status            → "On Time"
    A single db.commit() makes both changes atomic.
    """

    # ── Zero all delays ────────────────────────────────────────────────────────
    schedules_updated = db.query(Schedule).all()
    db.query(Schedule).update({Schedule.delay_minutes: 0}, synchronize_session=False)

    # ── Restore all train statuses ─────────────────────────────────────────────
    # We use a safe blanket "On Time" for the reset state.  The next optimization
    # run will immediately re-derive real statuses from the solver output.
    trains_updated = db.query(Train).all()
    db.query(Train).update({Train.status: "On Time"}, synchronize_session=False)

    # ── Single atomic commit ───────────────────────────────────────────────────
    db.commit()

    return {
        "status":  "success",
        "message": f"Database reset to default parameters. "
                   f"{len(schedules_updated)} schedules cleared, "
                   f"{len(trains_updated)} train statuses restored.",
    }



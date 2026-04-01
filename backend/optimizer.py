"""
optimizer.py — TRAX Dynamic N-Train CP-SAT Junction Scheduler
==============================================================
Implements `optimize_network`, a self-contained function that uses Google
OR-Tools Constraint Programming / Satisfiability (CP-SAT) to schedule an
arbitrary number of trains across a multi-track network with topology.

Key guarantees provided by the model:
  • Safety     — AddNoOverlap ensures no two trains overlap on any single track.
  • Topology   — Trains choose exactly one track (Optional intervals).
  • Blockages  — Physical blockages cast "ghost" intervals across tracks.
  • Capacity   — AddCumulative ensures stations do not exceed platform limits.
  • Fairness   — The objective minimises delay weighted by train priority.
"""

import logging

from ortools.sat.python import cp_model


# ---------------------------------------------------------------------------
# CONSTANTS
# ---------------------------------------------------------------------------
JUNCTION_DURATION_MINS: int = 10
PLANNING_HORIZON_MINS: int = 1440


def optimize_network(
    trains_data: list[dict],
    tracks_data: list[dict],
    injected_delays: dict,
    track_blockages: list[dict] = None,
    capacity_changes: list[dict] = None,
) -> dict:
    # ── 0. Guard: nothing to schedule ─────────────────────────────────────────
    if not trains_data or not tracks_data:
        return {"status": "failed", "message": "Missing train or track data."}

    track_blockages = track_blockages or []
    capacity_changes = capacity_changes or []

    # ── 1. Initialise the CP-SAT Model ────────────────────────────────────────
    model = cp_model.CpModel()

    track_intervals = {t['id']: [] for t in tracks_data}
    track_presences = {}
    train_opt_intervals = {}
    
    train_vars: dict[str, dict] = {}
    penalty_terms: list = []

    # ── 2. Multi-Track Routing (Optional Intervals) ───────────────────────────
    for train in trains_data:
        tid      = train["id"]
        priority = int(train.get("priority", 1))
        db_delay = int(train.get("delay", 0))

        extra_delay = int(injected_delays.get(tid, 0))
        base_time   = db_delay + extra_delay

        start_var = model.NewIntVar(base_time, base_time + PLANNING_HORIZON_MINS, f"start_{tid}")
        end_var = model.NewIntVar(base_time + JUNCTION_DURATION_MINS, base_time + JUNCTION_DURATION_MINS + PLANNING_HORIZON_MINS, f"end_{tid}")
        delay_var = model.NewIntVar(0, PLANNING_HORIZON_MINS, f"delay_{tid}")

        model.Add(delay_var == start_var - base_time)
        penalty_terms.append(delay_var * priority)

        # Enforce strict routing: train presence MUST map to physical nodes
        src = train.get("source", "").replace("Station ", "").strip()
        dst = train.get("destination", "").replace("Station ", "").strip()
        
        target_section = f"{src}-{dst}"
        valid_tracks = [t for t in tracks_data if t.get("section_id") == target_section]

        # Fallback: If A-D doesn't exist, lock it to the track starting with A (e.g., A-B)
        if not valid_tracks and src:
            valid_tracks = [t for t in tracks_data if t.get("section_id", "").startswith(f"{src}-")]

        # Ultimate safety net to prevent bypassing
        if not valid_tracks:
            valid_tracks = tracks_data

        # Determine required track type based on train type
        train_type_str = train.get('type', '').lower().strip()
        required_type = 'mainline' if train_type_str in ['express', 'freight'] else 'loop'

        # CRITICAL: Force the database string to lowercase for the comparison
        functional_tracks = [
            t for t in valid_tracks
            if str(t.get('track_type', '')).lower().strip() == required_type
        ]

        # STRICT ENFORCEMENT: No fallback. If it's an Express, it waits for a Mainline.
        valid_tracks = functional_tracks

        presence_vars = []
        for track in valid_tracks:
            track_id = track["id"]
            presence = model.NewBoolVar(f"presence_{tid}_{track_id}")
            presence_vars.append(presence)
            track_presences[(tid, track_id)] = presence
            
            opt_interval = model.NewOptionalIntervalVar(
                start_var,
                JUNCTION_DURATION_MINS,
                end_var,
                presence,
                f"opt_interval_{tid}_{track_id}"
            )
            track_intervals[track_id].append(opt_interval)
            train_opt_intervals[(tid, track_id)] = opt_interval

        if presence_vars:
            # Enforce routing: train MUST choose exactly ONE valid track in its path
            model.AddExactlyOne(presence_vars)
        else:
            logging.warning(
                "Bypassing train %s: Cannot map route '%s' to physical topology.",
                tid,
                target_section,
            )

        train_vars[tid] = {
            "start_var": start_var,
            "delay_var": delay_var,
            "base_time": base_time,
        }

    # ── 3. Track Blockages (Ghost Trains) ─────────────────────────────────────
    for i, blockage in enumerate(track_blockages):
        b_start    = int(blockage["start_time"])
        b_duration = int(blockage["duration"])
        b_end      = b_start + b_duration
        
        # Apply the blockage to EVERY track's interval list
        for track_id in track_intervals:
            ghost_interval = model.NewIntervalVar(
                b_start,
                b_duration,
                b_end,
                f"blockage_{i}_{track_id}_{b_start}",
            )
            track_intervals[track_id].append(ghost_interval)

    # ── 4. Per-Track Safety (NoOverlap) ───────────────────────────────────────
    for track_id, intervals in track_intervals.items():
        if intervals:
            model.AddNoOverlap(intervals)

    # ── 5. Platform Capacity (Cumulative) ─────────────────────────────────────
    for change in capacity_changes:
        station = change.get('station')
        capacity = int(change.get('capacity', 1))

        # Identify all tracks that connect to this station
        # Assuming section_id looks like "A-B", check if station is in the parts
        connected_track_ids = [
            t['id'] for t in tracks_data 
            if station in t.get('section_id', '').split('-')
        ]

        collected_intervals = []
        for tid in train_vars.keys():
            for track_id in connected_track_ids:
                if (tid, track_id) in train_opt_intervals:
                    collected_intervals.append(train_opt_intervals[(tid, track_id)])

        if collected_intervals:
            demands = [1] * len(collected_intervals)
            model.AddCumulative(collected_intervals, demands, capacity)

    # ── 6. Objective Function — Weighted Delay Minimisation ───────────────────
    model.Minimize(sum(penalty_terms))

    # ── 7. Solve ───────────────────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0

    status = solver.Solve(model)

    # ── 8. Extract and format results ─────────────────────────────────────────
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        result: dict = {}

        for tid, vars_dict in train_vars.items():
            new_start   = solver.Value(vars_dict["start_var"])
            total_delay = solver.Value(vars_dict["delay_var"])
            
            # Find which track the solver chose for this train
            assigned_track = None
            for track in tracks_data:
                track_id = track["id"]
                dict_key = (tid, track_id)
                # CRITICAL FIX: Check if key exists in dictionary first
                if dict_key in track_presences and solver.Value(track_presences[dict_key]) == 1:
                    assigned_track = track_id
                    break

            result[tid] = {
                "new_start_time":   new_start,
                "total_delay_mins": total_delay,
                "track_id":         assigned_track,
            }

        return result

    # ── 9. Failure path ────────────────────────────────────────────────────────
    status_name = solver.StatusName(status)
    return {
        "status": "failed",
        "message": f"CP-SAT solver returned {status_name}. "
                   f"No feasible schedule found within the planning horizon.",
    }


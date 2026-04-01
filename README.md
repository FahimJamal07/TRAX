# TRAX: Railway Traffic Control & Optimization System

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![OR-Tools](https://img.shields.io/badge/Google_OR--Tools-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/optimization)

## Overview
TRAX is an enterprise-grade Railway Traffic Control dashboard designed to simulate, monitor, and optimize train schedules across a multi-node transit network. Powered by Google's OR-Tools (CP-SAT solver) on the backend and a high-performance React SVG engine on the frontend, TRAX mathematically resolves scheduling conflicts, enforces physical routing constraints, and provides real-time telemetry to Section Controllers.

## Core Features
* **Constraint Programming Engine:** Utilizes a CP-SAT solver to automatically generate conflict-free schedules, minimizing total network delay.
* **Functional Topology Routing:** Physically segregates high-speed Express/Freight traffic onto bypass **Mainlines** while routing Passenger traffic into docking **Loop Lines**.
* **Live SVG Section Map:** A custom-built, mathematically scaled interactive map featuring dynamic platform capacity indicators, anti-collision train layout algorithms, and deep-dive telemetry tooltips.
* **Real-Time Network Telemetry:** Live dashboards displaying Track Saturation, Delay Analytics, and critical system alerts.
* **Infrastructure Simulation:** Allows dispatchers to inject delays or block physical track sections to test network resilience and trigger automatic re-optimization.

---

## Architecture & Tech Stack

The repository is strictly divided into two decoupled services:

### Frontend (`/frontend`)
* **Framework:** React.js (via Vite)
* **Styling:** Tailwind CSS
* **Data Visualization:** Native SVG DOM manipulation & Recharts/Chart.js

### Backend (`/backend`)
* **Framework:** FastAPI (Python)
* **Optimization Engine:** Google OR-Tools (`cp_model`)
* **Database:** SQLite (via SQLAlchemy ORM)
* **Authentication:** JWT (JSON Web Tokens)

---

## Getting Started

### Prerequisites
* **Node.js** (v18.0 or higher)
* **Python** (v3.10 or higher)

### 1. Backend Setup

Open a terminal in the root directory of the project:

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install required Python packages
pip install fastapi uvicorn sqlalchemy google-optpal pydantic

# Set up environment variables
# Create a .env file in the root directory and add a secure cryptographic key:
echo "TRAX_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')" > .env

# Seed the database with the initial 5-station topology and train roster
python -m backend.seed

# Start the FastAPI server
uvicorn backend.main:app --reload
```
The backend API will now be running at <http://127.0.0.1:8000.>

---
## Usage Guide

1. **Dashboard Overview**: Upon logging in, the Section Controller is presented with the live network state, including active delays and track saturation metrics.

2. **Section Map**: Navigate to the Map tab to view the physical layout of the trains. Hover over trains or station cards for exact scheduling deviations and platform utilization.

3. **Simulation & Optimization**: Use the Simulation panel to add a new train to the network or inject a delay. The backend CP-SAT solver will automatically recalculate the global schedule and push the updated, conflict-free routes to the map.

---
## Project Structure 

```
TRAX/
├── backend/
│   ├── __init__.py
│   ├── main.py          # FastAPI application & route definitions
│   ├── models.py        # SQLAlchemy database schemas
│   ├── optimizer.py     # CP-SAT constraint programming logic
│   └── seed.py          # Database initialization script
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/  # Reusable UI widgets (Header, Modals)
│   │   ├── pages/       # Core views (Dashboard, SectionMap, Simulation)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
├── .env                 # Secret keys and environment variables
├── .gitignore
└── README.md
```

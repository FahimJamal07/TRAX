# TRAX

Train Traffic Control and optimization platform with a FastAPI backend and React/Vite frontend.

## Deployment Checklist

1. Create environment variables from .env.example.
2. Set TRAX_SECRET_KEY to a strong random value (do not use dev fallback).
3. Verify backend CORS origin matches the deployed frontend URL.
4. Install backend dependencies:
   - pip install -r backend/requirements.txt
5. Seed database when needed:
   - python -m backend.seed
6. Run backend:
   - uvicorn backend.main:app --host 0.0.0.0 --port 8000
7. Build frontend:
   - cd frontend
   - npm ci
   - npm run build
8. Confirm no debug artifacts are committed:
   - no __pycache__, node_modules, dist, or .env files tracked
9. Smoke test core APIs:
   - POST /api/v1/register
   - POST /api/v1/token
   - GET /api/v1/trains
   - POST /api/v1/optimize
10. Rotate admin credentials and secret key for production go-live.

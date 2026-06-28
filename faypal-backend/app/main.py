from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, get_db
from app.routers import alerts, risk_scores, sensors, zones
from app.routers import auth, users, dashboard, ml, weather

app = FastAPI(
    title="Faypal API",
    description="API de prévention du paludisme",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers publics ────────────────────────────────────────────────────────────
app.include_router(auth.router)

# ── Routers protégés ───────────────────────────────────────────────────────────
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(zones.router)
app.include_router(sensors.router)
app.include_router(risk_scores.router)
app.include_router(alerts.router)
app.include_router(ml.router)
app.include_router(weather.router)


@app.get("/")
def root():
    return {"message": "Faypal backend running"}


@app.get("/health")
def health_check():
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connectée"}
    except Exception as e:
        return {"status": "erreur", "database": str(e)}

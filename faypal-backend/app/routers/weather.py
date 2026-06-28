from datetime import date, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/weather", tags=["Weather"])

# Centre géographique du Sénégal
SENEGAL_LAT = 14.5
SENEGAL_LON = -14.5

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL  = "https://archive-api.open-meteo.com/v1/archive"

MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
                "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]


def _fetch(url: str, params: dict) -> dict:
    try:
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Open-Meteo indisponible : {exc}")


@router.get("/national")
def get_national_weather(_: User = Depends(get_current_user)):
    """
    Retourne :
      - weekly  : 7 derniers jours (temp, humidity, rainfall)
      - monthly : 12 derniers mois (moyennes temp, humidity, rainfall)
    Source : Open-Meteo (gratuit, sans clé API)
    """
    today = date.today()

    # ── Semaine : 7 derniers jours ────────────────────────────────
    week_data = _fetch(FORECAST_URL, {
        "latitude":   SENEGAL_LAT,
        "longitude":  SENEGAL_LON,
        "daily":      "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max",
        "past_days":  6,
        "forecast_days": 1,
        "timezone":   "Africa/Dakar",
    })

    day_labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    weekly = []
    daily = week_data.get("daily", {})
    dates     = daily.get("time", [])
    temp_max  = daily.get("temperature_2m_max", [])
    temp_min  = daily.get("temperature_2m_min", [])
    hum_max   = daily.get("relative_humidity_2m_max", [])
    rain      = daily.get("precipitation_sum", [])

    for i, d in enumerate(dates):
        dt = date.fromisoformat(d)
        weekly.append({
            "day":      day_labels[dt.weekday()],
            "date":     d,
            "temp":     round((temp_max[i] + temp_min[i]) / 2, 1) if temp_max[i] is not None and temp_min[i] is not None else None,
            "humidity": hum_max[i],
            "rainfall": round(rain[i], 1) if rain[i] is not None else 0,
        })

    # ── Mensuel : 12 derniers mois ────────────────────────────────
    start = (today.replace(day=1) - timedelta(days=335)).replace(day=1)
    end   = today.replace(day=1) - timedelta(days=1)

    archive_data = _fetch(ARCHIVE_URL, {
        "latitude":  SENEGAL_LAT,
        "longitude": SENEGAL_LON,
        "start_date": start.isoformat(),
        "end_date":   end.isoformat(),
        "daily":     "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max",
        "timezone":  "Africa/Dakar",
    })

    arc_daily  = archive_data.get("daily", {})
    arc_dates  = arc_daily.get("time", [])
    arc_tmax   = arc_daily.get("temperature_2m_max", [])
    arc_tmin   = arc_daily.get("temperature_2m_min", [])
    arc_hum    = arc_daily.get("relative_humidity_2m_max", [])
    arc_rain   = arc_daily.get("precipitation_sum", [])

    # Grouper par mois
    month_buckets: dict[str, dict] = {}
    for i, d in enumerate(arc_dates):
        ym = d[:7]  # "YYYY-MM"
        if ym not in month_buckets:
            month_buckets[ym] = {"temps": [], "hums": [], "rains": []}
        if arc_tmax[i] is not None and arc_tmin[i] is not None:
            month_buckets[ym]["temps"].append((arc_tmax[i] + arc_tmin[i]) / 2)
        if arc_hum[i] is not None:
            month_buckets[ym]["hums"].append(arc_hum[i])
        if arc_rain[i] is not None:
            month_buckets[ym]["rains"].append(arc_rain[i])

    monthly = []
    for ym in sorted(month_buckets.keys()):
        b   = month_buckets[ym]
        mo  = int(ym[5:7])
        monthly.append({
            "month":    MONTH_LABELS[mo - 1],
            "ym":       ym,
            "temp":     round(sum(b["temps"]) / len(b["temps"]), 1) if b["temps"] else None,
            "humidity": round(sum(b["hums"])  / len(b["hums"]),  0) if b["hums"]  else None,
            "rainfall": round(sum(b["rains"]), 1),
        })

    return {"weekly": weekly, "monthly": monthly}

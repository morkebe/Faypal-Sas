from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.alert import Alert
from app.models.risk_score import RiskScore
from app.models.sensor import Sensor
from app.models.sensor_data import SensorData
from app.models.sensor_detection import SensorDetection
from app.models.zone import Zone
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # ── Capteurs ───────────────────────────────────────────────────────────────
    sensors_all = db.query(Sensor).all()
    total_sensors  = len(sensors_all)
    actifs         = sum(1 for s in sensors_all if s.statut == "actif")
    en_alerte      = sum(1 for s in sensors_all if s.statut == "alerte")
    hors_ligne     = sum(1 for s in sensors_all if s.statut == "hors_ligne")

    # ── Moustiques détectés (24h) ──────────────────────────────────────────────
    since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    moustiques_24h = (
        db.query(func.coalesce(func.sum(SensorDetection.nombre_detecte), 0))
        .join(SensorData, SensorDetection.sensor_data_id == SensorData.id)
        .filter(SensorData.capture_a >= since_24h)
        .scalar()
    ) or 0

    # ── Zones critiques (score >= 0.5) ─────────────────────────────────────────
    subq = (
        db.query(RiskScore.zone_id, func.max(RiskScore.calcule_a).label("last"))
        .group_by(RiskScore.zone_id)
        .subquery()
    )
    derniers_scores = (
        db.query(RiskScore)
        .join(subq, (RiskScore.zone_id == subq.c.zone_id) & (RiskScore.calcule_a == subq.c.last))
        .all()
    )
    zones_critiques = sum(1 for s in derniers_scores if s.score >= 0.5)

    # ── Top scores (3 plus élevés) ─────────────────────────────────────────────
    top_scores = []
    for rs in sorted(derniers_scores, key=lambda s: s.score, reverse=True)[:3]:
        zone = db.query(Zone).filter(Zone.id == rs.zone_id).first()
        top_scores.append({
            "zone": zone.nom if zone else "?",
            "score": round(rs.score * 100),
            "niveau": rs.niveau_risque,
        })

    # ── Alertes récentes ───────────────────────────────────────────────────────
    alertes_recentes = (
        db.query(Alert)
        .filter(Alert.statut != "acquittee")
        .order_by(Alert.declenchee_a.desc())
        .limit(5)
        .all()
    )
    alertes_out = []
    for a in alertes_recentes:
        zone = db.query(Zone).filter(Zone.id == a.zone_id).first()
        score_val = None
        if a.score_id:
            rs = db.query(RiskScore).filter(RiskScore.id == a.score_id).first()
            score_val = round(rs.score * 100) if rs else None
        alertes_out.append({
            "id": str(a.id),
            "zone": zone.nom if zone else "?",
            "type": a.type,
            "severite": a.severite,
            "message": a.message,
            "statut": a.statut,
            "score": score_val,
            "declenchee_a": a.declenchee_a.isoformat() if a.declenchee_a else None,
        })

    # ── Flotte capteurs détaillée ──────────────────────────────────────────────
    flotte = []
    for s in sensors_all:
        zone = db.query(Zone).filter(Zone.id == s.zone_id).first()
        # Dernière donnée reçue
        last_data = (
            db.query(SensorData)
            .filter(SensorData.sensor_id == s.id)
            .order_by(SensorData.capture_a.desc())
            .first()
        )
        flotte.append({
            "id": str(s.id),
            "numero_serie": s.numero_serie,
            "zone": zone.nom if zone else "?",
            "statut": s.statut,
            "modele": s.modele,
            "vu_le": s.vu_le.isoformat() if s.vu_le else (last_data.capture_a.isoformat() if last_data else None),
        })

    return {
        "capteurs": {
            "total": total_sensors,
            "actifs": actifs,
            "en_alerte": en_alerte,
            "hors_ligne": hors_ligne,
        },
        "moustiques_24h": int(moustiques_24h),
        "zones_critiques": zones_critiques,
        "top_scores": top_scores,
        "alertes_recentes": alertes_out,
        "flotte": flotte,
    }

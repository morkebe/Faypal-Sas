from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.alert import Alert
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertResponse

router = APIRouter(prefix="/alerts", tags=["Alertes"])


@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste toutes les alertes — tous les rôles."""
    return db.query(Alert).order_by(Alert.declenchee_a.desc()).all()


@router.get("/actives", response_model=List[AlertResponse])
def get_alerts_actives(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Alertes non traitées (créée ou vue) — tous les rôles."""
    return db.query(Alert).filter(
        Alert.statut.in_(["creee", "vue"])
    ).order_by(Alert.declenchee_a.desc()).all()


@router.get("/zone/{zone_id}", response_model=List[AlertResponse])
def get_alerts_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Alertes d'une zone — tous les rôles."""
    return db.query(Alert).filter(
        Alert.zone_id == zone_id
    ).order_by(Alert.declenchee_a.desc()).all()


@router.post("/", response_model=AlertResponse, status_code=201)
def create_alert(
    alert: AlertCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "analyste")),
):
    """Crée une alerte — admin et analyste."""
    nouvelle_alert = Alert(**alert.model_dump())
    db.add(nouvelle_alert)
    db.commit()
    db.refresh(nouvelle_alert)
    return nouvelle_alert


@router.patch("/{alert_id}/acquitter", response_model=AlertResponse)
def acquitter_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "analyste", "agent_terrain")),
):
    """Acquitte une alerte — admin, analyste et agent terrain."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    alert.statut = "acquittee"
    alert.acquittee_a = datetime.now()
    db.commit()
    db.refresh(alert)
    return alert

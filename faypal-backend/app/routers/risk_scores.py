from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.risk_score import RiskScore
from app.models.user import User
from app.schemas.risk_score import RiskScoreCreate, RiskScoreResponse, ScoreCalculeResponse

router = APIRouter(prefix="/scores", tags=["Scores de risque"])


@router.get("/", response_model=List[RiskScoreResponse])
def get_scores(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste tous les scores — tous les rôles."""
    return db.query(RiskScore).order_by(RiskScore.calcule_a.desc()).all()


@router.get("/zone/{zone_id}", response_model=List[RiskScoreResponse])
def get_scores_par_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Historique des scores d'une zone — tous les rôles."""
    scores = db.query(RiskScore).filter(
        RiskScore.zone_id == zone_id
    ).order_by(RiskScore.calcule_a.desc()).all()
    if not scores:
        raise HTTPException(status_code=404, detail="Aucun score pour cette zone")
    return scores


@router.get("/zone/{zone_id}/dernier", response_model=RiskScoreResponse)
def get_dernier_score(
    zone_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Dernier score calculé pour une zone — tous les rôles."""
    score = db.query(RiskScore).filter(
        RiskScore.zone_id == zone_id
    ).order_by(RiskScore.calcule_a.desc()).first()
    if not score:
        raise HTTPException(status_code=404, detail="Aucun score pour cette zone")
    return score


@router.post("/calculer/{zone_id}", response_model=ScoreCalculeResponse, status_code=201)
def calculer_score(
    zone_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "analyste")),
):
    """
    Déclenche le pipeline complet pour une zone :
    météo Open-Meteo + données DHIS2 + capteurs → score → alerte si critique.
    La zone doit avoir latitude/longitude dans son champ metadata.
    """
    from app.workers.scoring_worker import run
    try:
        return run(zone_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/", response_model=RiskScoreResponse, status_code=201)
def create_score(
    score: RiskScoreCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "analyste")),
):
    """Enregistre un score manuellement — admin et analyste."""
    nouveau_score = RiskScore(**score.model_dump())
    db.add(nouveau_score)
    db.commit()
    db.refresh(nouveau_score)
    return nouveau_score

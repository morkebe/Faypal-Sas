from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class RiskScoreBase(BaseModel):
    zone_id: UUID
    score: float
    niveau_risque: Optional[str] = None
    facteurs: Optional[dict] = None
    version_algo: Optional[str] = "v1.0"


class RiskScoreCreate(RiskScoreBase):
    pass


class RiskScoreResponse(RiskScoreBase):
    id: UUID
    calcule_a: datetime

    class Config:
        from_attributes = True


class ScoreCalculeResponse(BaseModel):
    """Réponse enrichie retournée par POST /scores/calculer/{zone_id}."""
    score: RiskScoreResponse
    alerte_creee: bool
    meteo: Optional[dict] = None
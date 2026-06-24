from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.zone import Zone
from app.schemas.zone import ZoneCreate, ZoneResponse

router = APIRouter(prefix="/zones", tags=["Zones"])


@router.get("/", response_model=List[ZoneResponse])
def get_zones(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste toutes les zones — tous les rôles."""
    return db.query(Zone).all()


@router.get("/niveau/{niveau}", response_model=List[ZoneResponse])
def get_zones_par_niveau(
    niveau: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Zones filtrées par niveau (region / district / quartier) — tous les rôles."""
    zones = db.query(Zone).filter(Zone.niveau == niveau).all()
    if not zones:
        raise HTTPException(status_code=404, detail=f"Aucune zone de niveau '{niveau}'")
    return zones


@router.get("/{zone_id}", response_model=ZoneResponse)
def get_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Détails d'une zone — tous les rôles."""
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone introuvable")
    return zone


@router.post("/", response_model=ZoneResponse, status_code=201)
def create_zone(
    zone: ZoneCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "analyste")),
):
    """Crée une zone — admin et analyste uniquement."""
    nouvelle_zone = Zone(**zone.model_dump())
    db.add(nouvelle_zone)
    db.commit()
    db.refresh(nouvelle_zone)
    return nouvelle_zone


@router.delete("/{zone_id}", status_code=204)
def delete_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Supprime une zone — admin uniquement."""
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone introuvable")
    db.delete(zone)
    db.commit()

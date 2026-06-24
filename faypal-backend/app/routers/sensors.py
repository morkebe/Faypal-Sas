from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.mosquito_species import MosquitoSpecies
from app.models.sensor import Sensor
from app.models.sensor_data import SensorData
from app.models.sensor_detection import SensorDetection
from app.models.user import User
from app.models.zone import Zone
from app.schemas.sensor import SensorCreate, SensorResponse
from app.schemas.sensor_data import (
    DetectionResponse,
    SensorDataInput,
    SensorDataResponse,
)
from app.services import ml_service

router = APIRouter(prefix="/sensors", tags=["Capteurs"])


# ── Lecture ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[SensorResponse])
def get_sensors(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste tous les capteurs — tous les rôles."""
    return db.query(Sensor).all()


@router.get("/zone/{zone_id}", response_model=List[SensorResponse])
def get_sensors_par_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Capteurs d'une zone — tous les rôles."""
    sensors = db.query(Sensor).filter(Sensor.zone_id == zone_id).all()
    if not sensors:
        raise HTTPException(status_code=404, detail="Aucun capteur dans cette zone")
    return sensors


@router.get("/{sensor_id}", response_model=SensorResponse)
def get_sensor(
    sensor_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Détails d'un capteur — tous les rôles."""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Capteur introuvable")
    return sensor


# ── Écriture ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=SensorResponse, status_code=201)
def create_sensor(
    sensor: SensorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Enregistre un nouveau capteur Moustibox — admin uniquement."""
    nouveau_sensor = Sensor(**sensor.model_dump())
    db.add(nouveau_sensor)
    db.commit()
    db.refresh(nouveau_sensor)
    return nouveau_sensor


@router.patch("/{sensor_id}/statut", response_model=SensorResponse)
def update_statut(
    sensor_id: UUID,
    statut: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "analyste")),
):
    """Met à jour le statut d'un capteur — admin et analyste."""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Capteur introuvable")
    if statut not in ["actif", "inactif", "maintenance"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    sensor.statut = statut
    db.commit()
    db.refresh(sensor)
    return sensor


# ── Réception données Moustibox ────────────────────────────────────────────────

@router.post("/{sensor_id}/data", response_model=SensorDataResponse, status_code=201)
def recevoir_donnees_moustibox(
    sensor_id: UUID,
    payload: SensorDataInput,
    db: Session = Depends(get_db),
):
    """
    Reçoit les données envoyées par un capteur Moustibox sur le terrain.

    Le capteur identifie les espèces de moustiques et envoie le comptage.
    Chaque appel crée un enregistrement SensorData + les détections associées.

    Cet endpoint est volontairement ouvert (pas de JWT) car il est appelé
    par le firmware embarqué du Moustibox.
    TODO : sécuriser avec une clé API par capteur en production.
    """
    # Vérifier que le capteur existe et est actif
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Capteur introuvable")
    if sensor.statut != "actif":
        raise HTTPException(
            status_code=403,
            detail=f"Capteur non actif (statut : {sensor.statut})"
        )

    # Créer l'enregistrement SensorData
    now = datetime.now(timezone.utc)
    sensor_data = SensorData(
        sensor_id   = sensor_id,
        payload_brut = payload.payload_brut,
        capture_a   = now,
    )
    db.add(sensor_data)
    db.flush()   # récupère l'ID sans committer

    # Traiter chaque détection
    detections_response = []
    nb_vecteurs = 0

    for detection in payload.detections:
        # Chercher l'espèce par nom scientifique (insensible à la casse)
        espece = db.query(MosquitoSpecies).filter(
            MosquitoSpecies.nom_scientifique.ilike(detection.nom_scientifique)
        ).first()

        if not espece:
            # Espèce inconnue → on la stocke quand même sous forme brute
            # dans payload_brut, on ne crée pas de SensorDetection
            continue

        sd = SensorDetection(
            sensor_data_id = sensor_data.id,
            species_id     = espece.id,
            nombre_detecte = detection.nombre,
        )
        db.add(sd)

        if espece.vecteur_paludisme:
            nb_vecteurs += detection.nombre

        detections_response.append(DetectionResponse(
            espece      = espece.nom_scientifique,
            nombre      = detection.nombre,
            est_vecteur = espece.vecteur_paludisme,
        ))

    # Mettre à jour la date de dernière communication du capteur
    sensor.vu_le = now
    db.commit()

    # Enrichir l'indice vectoriel du ML si la zone est mappée à une région ML
    if nb_vecteurs > 0 and sensor.zone_id:
        zone = db.query(Zone).filter(Zone.id == sensor.zone_id).first()
        region_ml = (zone.metadata_ or {}).get("region_ml") if zone else None
        if region_ml:
            duree = float((payload.payload_brut or {}).get("duree_minutes", 60.0))
            ml_service.envoyer_rapport_moustibox(
                region=region_ml,
                district=zone.nom,
                timestamp=now.isoformat(),
                duree_minutes=duree,
                total_captures=sum(d.nombre for d in payload.detections),
                anopheles_detectes=nb_vecteurs,
            )

    return SensorDataResponse(
        id             = sensor_data.id,
        sensor_id      = sensor_id,
        capture_a      = now,
        nb_detections  = len(detections_response),
        nb_vecteurs    = nb_vecteurs,
        detections     = detections_response,
    )

from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime


class DetectionInput(BaseModel):
    """Une ligne de détection envoyée par le Moustibox."""
    nom_scientifique: str = Field(
        ...,
        description="Nom scientifique de l'espèce identifiée par le capteur",
        examples=["anopheles gambiae"]
    )
    nombre: int = Field(..., ge=1, description="Nombre de spécimens détectés")


class SensorDataInput(BaseModel):
    """
    Corps de la requête envoyée par un capteur Moustibox.

    Le Moustibox identifie lui-même les espèces et envoie le comptage.
    Le champ payload_brut est optionnel — il permet de stocker les
    données brutes du capteur pour l'audit ou le débogage.
    """
    detections: List[DetectionInput] = Field(
        ...,
        description="Liste des espèces détectées avec leur comptage"
    )
    payload_brut: Optional[dict] = Field(
        None,
        description="Données brutes optionnelles envoyées par le capteur"
    )


class DetectionResponse(BaseModel):
    espece: str
    nombre: int
    est_vecteur: bool


class SensorDataResponse(BaseModel):
    """Réponse retournée après réception des données d'un capteur."""
    id: UUID
    sensor_id: UUID
    capture_a: datetime
    nb_detections: int
    nb_vecteurs: int
    detections: List[DetectionResponse]

    class Config:
        from_attributes = True

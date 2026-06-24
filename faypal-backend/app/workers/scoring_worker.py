import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.mosquito_species import MosquitoSpecies
from app.models.risk_score import RiskScore
from app.models.sensor import Sensor
from app.models.sensor_data import SensorData
from app.models.sensor_detection import SensorDetection
from app.models.zone import Zone
from app.services.alert_service import check_and_create_alert
from app.services.scoring_service import calculate_score
from app.services.ml_service import (
    MLServiceUnavailableError,
    construire_facteurs_ml,
    normaliser_score_ml,
    predict_multi_horizon,
)
from app.workers.weather_worker import get_weather

logger = logging.getLogger(__name__)


def _compter_vecteurs_24h(zone_id: UUID, db: Session) -> int:
    """
    Compte les moustiques vecteurs (vecteur_paludisme=True) détectés
    par tous les capteurs de la zone dans les dernières 24 heures.
    """
    depuis = datetime.now(timezone.utc) - timedelta(hours=24)

    rows = (
        db.query(SensorDetection.nombre_detecte)
        .join(SensorData,      SensorDetection.sensor_data_id == SensorData.id)
        .join(Sensor,          SensorData.sensor_id           == Sensor.id)
        .join(MosquitoSpecies, SensorDetection.species_id     == MosquitoSpecies.id)
        .filter(
            Sensor.zone_id                    == zone_id,
            SensorData.capture_a              >= depuis,
            MosquitoSpecies.vecteur_paludisme == True,
        )
        .all()
    )
    return sum(row.nombre_detecte for row in rows)


def _run_ml(zone: Zone) -> Optional[dict]:
    """
    Tente une prédiction via faypal_ML (XGBoost multi-horizon).

    Requiert que zone.metadata_["region_ml"] soit renseigné avec l'une
    des 14 régions sénégalaises reconnues par le ML (ex : "DAKAR").

    Retourne un dict {score, niveau_risque, facteurs, version_algo}
    ou None si le ML est indisponible ou si region_ml est absent.
    """
    region_ml = (zone.metadata_ or {}).get("region_ml")
    if not region_ml:
        return None

    now     = datetime.now(timezone.utc)
    semaine = now.isocalendar()[1]
    annee   = now.year

    try:
        ml_response = predict_multi_horizon(region_ml, semaine, annee)
    except MLServiceUnavailableError as exc:
        logger.warning("faypal_ML indisponible — fallback rule-based : %s", exc)
        return None

    score, niveau_risque = normaliser_score_ml(ml_response)
    facteurs             = construire_facteurs_ml(ml_response, region_ml)

    return {
        "score":         score,
        "niveau_risque": niveau_risque,
        "facteurs":      facteurs,
        "version_algo":  "ml-xgboost-v2",
    }


def _run_fallback(zone_id: UUID, zone: Zone, db: Session) -> tuple[dict, Optional[dict]]:
    """
    Pipeline rule-based (v1) : météo Open-Meteo + comptage capteurs 24h.

    Utilisé automatiquement si faypal_ML est inaccessible ou si
    zone.metadata_["region_ml"] n'est pas configuré.

    Retourne (resultat_dict, weather_dict | None).
    """
    metadata  = zone.metadata_ or {}
    latitude  = metadata.get("latitude")
    longitude = metadata.get("longitude")

    weather = None
    if latitude is not None and longitude is not None:
        weather = get_weather(latitude, longitude)

    nb_vecteurs = _compter_vecteurs_24h(zone_id, db)
    resultat    = calculate_score(nb_vecteurs, weather)

    return {**resultat, "version_algo": "rule-v1.0"}, weather


def run(zone_id: UUID, db: Session) -> dict:
    """
    Pipeline de calcul du score de risque pour une zone.

    Priorité :
        1. faypal_ML  — XGBoost multi-horizon (S+1 / S+4 / S+12)
           → nécessite zone.metadata_["region_ml"] (l'une des 14 régions ML)
        2. Rule-based — météo Open-Meteo + comptage Anopheles 24h (fallback)

    La source utilisée est traçable via RiskScore.version_algo :
        - "ml-xgboost-v2"  → prédiction ML
        - "rule-v1.0"      → scoring rule-based

    Retourne :
        {
            "score"        : RiskScore,
            "alerte_creee" : bool,
            "meteo"        : dict | None,
        }
    """
    zone: Optional[Zone] = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise ValueError(f"Zone introuvable : {zone_id}")

    meteo = None

    # 1. Tentative ML (source principale)
    resultat = _run_ml(zone)

    # 2. Fallback rule-based si ML absent ou indisponible
    if resultat is None:
        resultat, meteo = _run_fallback(zone_id, zone, db)
    else:
        # ML réussi — enrichir facteurs avec météo Open-Meteo pour affichage
        metadata  = zone.metadata_ or {}
        latitude  = metadata.get("latitude")
        longitude = metadata.get("longitude")
        if latitude is not None and longitude is not None:
            weather = get_weather(latitude, longitude)
            if weather:
                meteo = weather
                resultat["facteurs"]["meteo"] = {"donnees": weather}

    # 3. Persistance
    risk_score = RiskScore(
        zone_id       = zone_id,
        score         = resultat["score"],
        niveau_risque = resultat["niveau_risque"],
        facteurs      = resultat["facteurs"],
        version_algo  = resultat["version_algo"],
    )
    db.add(risk_score)
    db.commit()
    db.refresh(risk_score)

    # 4. Alerte automatique
    alerte = check_and_create_alert(zone_id, risk_score, db)

    return {
        "score":        risk_score,
        "alerte_creee": alerte is not None,
        "meteo":        meteo,
    }

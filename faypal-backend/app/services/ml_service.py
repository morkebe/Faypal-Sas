import logging
from typing import Optional

import requests

from app.config import get_settings

logger = logging.getLogger(__name__)

# Mapping niveau_risque ML (majuscules) → score normalisé 0-1 backend
ML_NIVEAU_TO_SCORE: dict[str, float] = {
    "FAIBLE":   0.15,
    "MODERE":   0.40,
    "ELEVE":    0.65,
    "CRITIQUE": 0.90,
}


class MLServiceUnavailableError(Exception):
    pass


def _base_url() -> str:
    return get_settings().ml_service_url


def _timeout() -> int:
    return get_settings().ml_service_timeout


# ── Prédiction ────────────────────────────────────────────────────────────────

def predict_v2(region: str, semaine: int, annee: int) -> dict:
    """
    Appelle POST /predict/v2 sur faypal_ML.

    Retourne la prédiction enrichie (38 attributs) pour S+1 :
        {
            "region", "semaine", "annee",
            "cas_predits", "intervalle", "niveau_risque", "strate",
            "modele", "attributs_utilises", "timestamp"
        }
    """
    url = f"{_base_url()}/predict/v2"
    payload = {"region": region, "semaine": semaine, "annee": annee}

    try:
        resp = requests.post(url, json=payload, timeout=_timeout())
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.Timeout:
        raise MLServiceUnavailableError(f"faypal_ML timeout ({_timeout()}s)")
    except requests.exceptions.ConnectionError:
        raise MLServiceUnavailableError("faypal_ML inaccessible")
    except requests.exceptions.HTTPError as exc:
        raise MLServiceUnavailableError(
            f"faypal_ML erreur HTTP {exc.response.status_code} : {exc.response.text[:200]}"
        )


def predict_multi_horizon(region: str, semaine: int, annee: int) -> dict:
    """
    Appelle POST /predict/multi-horizon sur faypal_ML.

    Retourne la réponse brute du ML :
        {
            "region", "strate", "semaine_reference", "annee",
            "horizons": {
                "S+1":  {"cas_predits", "intervalle", "niveau_risque", ...},
                "S+4":  {...},
                "S+12": {...},
            },
            "tendance_4sem", "pic_attendu", "modele", "timestamp"
        }

    Lève MLServiceUnavailableError si le service est inaccessible.
    """
    url = f"{_base_url()}/predict/multi-horizon"
    payload = {"region": region, "semaine": semaine, "annee": annee}

    try:
        resp = requests.post(url, json=payload, timeout=_timeout())
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.Timeout:
        raise MLServiceUnavailableError(f"faypal_ML timeout ({_timeout()}s)")
    except requests.exceptions.ConnectionError:
        raise MLServiceUnavailableError("faypal_ML inaccessible")
    except requests.exceptions.HTTPError as exc:
        raise MLServiceUnavailableError(
            f"faypal_ML erreur HTTP {exc.response.status_code} : {exc.response.text[:200]}"
        )


def normaliser_score_ml(ml_response: dict) -> tuple[float, str]:
    """
    Convertit la réponse multi-horizon en (score 0-1, niveau_risque backend).

    Utilise l'horizon S+1 (prédiction immédiate) comme référence.
    Le niveau_risque backend est en minuscules ("faible", "modere", etc.)
    pour cohérence avec scoring_service.py.
    """
    h1 = ml_response.get("horizons", {}).get("S+1", {})
    niveau_ml = h1.get("niveau_risque", "FAIBLE").upper()
    score = ML_NIVEAU_TO_SCORE.get(niveau_ml, 0.15)
    niveau_backend = niveau_ml.lower()
    return score, niveau_backend


def construire_facteurs_ml(ml_response: dict, region_ml: str) -> dict:
    """
    Construit le dict stocké dans RiskScore.facteurs (JSONB).
    Conserve les 3 horizons, la tendance et les métadonnées ML.
    """
    horizons_bruts = ml_response.get("horizons", {})
    return {
        "source":        "ml-xgboost-v2",
        "region_ml":     region_ml,
        "semaine":       ml_response.get("semaine_reference"),
        "annee":         ml_response.get("annee"),
        "strate":        ml_response.get("strate"),
        "tendance_4sem": ml_response.get("tendance_4sem"),
        "pic_attendu":   ml_response.get("pic_attendu"),
        "horizons": {
            k: {
                "cas_predits":   v.get("cas_predits"),
                "intervalle":    v.get("intervalle"),
                "niveau_risque": v.get("niveau_risque"),
            }
            for k, v in horizons_bruts.items()
        },
    }


# ── Enrichissement MoustiBox ──────────────────────────────────────────────────

def envoyer_rapport_moustibox(
    region: str,
    district: str,
    timestamp: str,
    duree_minutes: float,
    total_captures: int,
    anopheles_detectes: int,
    compteurs: Optional[dict] = None,
) -> Optional[dict]:
    """
    Transfère un rapport MoustiBox vers faypal_ML pour enrichir l'indice_vectoriel
    du dataset CSV. Appelé en fire-and-forget après chaque POST /sensors/{id}/data.

    Retourne None sans lever d'exception si faypal_ML est indisponible —
    l'enrichissement est une amélioration optionnelle, pas un chemin critique.
    """
    url = f"{_base_url()}/moustibox/rapport"
    taux = round(anopheles_detectes / max(total_captures, 1), 4)
    payload = {
        "region":             region,
        "district":           district,
        "timestamp":          timestamp,
        "duree_minutes":      duree_minutes,
        "total_captures":     total_captures,
        "total_detections":   anopheles_detectes,
        "compteurs":          compteurs or {},
        "anopheles_detectes": anopheles_detectes,
        "alerte_paludisme":   anopheles_detectes >= 10,
        "taux_detection":     taux,
        "modele":             "MoustiBox-YOLOv8",
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning("Enrichissement ML ignoré (faypal_ML indisponible) : %s", exc)
        return None

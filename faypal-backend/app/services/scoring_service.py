from typing import Optional

# ── Pondérations ───────────────────────────────────────────────────────────────
POIDS_MOUSTIQUES = 0.60   # signal principal : présence du vecteur
POIDS_METEO      = 0.40   # conditions environnementales favorables

# ── Seuils moustiques ──────────────────────────────────────────────────────────
MAX_VECTEURS = 150  # au-delà → score moustique = 1.0

# ── Seuils météo ───────────────────────────────────────────────────────────────
TEMP_MIN_OPTIMALE = 25.0   # °C
TEMP_MAX_OPTIMALE = 32.0   # °C
HUMIDITE_SEUIL    = 70.0   # %
PLUIE_FORTE       = 5.0    # mm

# ── Niveaux de risque ──────────────────────────────────────────────────────────
SEUILS = [
    (0.25, "faible"),
    (0.50, "modere"),
    (0.75, "eleve"),
    (1.00, "critique"),
]


def _score_moustiques(nb_vecteurs: int) -> float:
    """Score 0→1 basé sur le nombre d'Anopheles détectés dans les 24h."""
    return min(nb_vecteurs / MAX_VECTEURS, 1.0)


def _score_meteo(weather: Optional[dict]) -> float:
    """
    Score 0→1 basé sur les conditions météo.
    Trois sous-facteurs : température (40%), humidité (40%), précipitations (20%).
    Retourne 0.0 si la météo est indisponible.
    """
    if not weather:
        return 0.0

    score = 0.0

    temp = weather.get("temperature") or 0.0
    if TEMP_MIN_OPTIMALE <= temp <= TEMP_MAX_OPTIMALE:
        score += 0.4
    elif temp > 20.0:
        score += 0.2

    humidity = weather.get("humidity") or 0.0
    if humidity >= HUMIDITE_SEUIL:
        score += 0.4 * min((humidity - HUMIDITE_SEUIL) / 30.0, 1.0)

    precipitation = weather.get("precipitation") or 0.0
    if precipitation >= PLUIE_FORTE:
        score += 0.2
    elif precipitation > 0:
        score += 0.1

    return min(score, 1.0)


def _niveau_risque(score: float) -> str:
    for seuil, niveau in SEUILS:
        if score <= seuil:
            return niveau
    return "critique"


def calculate_score(nb_vecteurs: int, weather: Optional[dict]) -> dict:
    """
    Calcule le score de risque paludisme pour une zone (0.0 → 1.0).

    Sources :
        - nb_vecteurs : moustiques Anopheles détectés dans les 24h (capteurs)
        - weather     : données Open-Meteo (température, humidité, pluie)

    Retourne :
        {
            "score"        : float,
            "niveau_risque": str,
            "facteurs"     : dict  (pour l'audit)
        }
    """
    s_moustiques = _score_moustiques(nb_vecteurs)
    s_meteo      = _score_meteo(weather)

    score = round(
        POIDS_MOUSTIQUES * s_moustiques + POIDS_METEO * s_meteo,
        4,
    )

    return {
        "score":         min(score, 1.0),
        "niveau_risque": _niveau_risque(score),
        "facteurs": {
            "moustiques": {
                "nb_vecteurs_24h": nb_vecteurs,
                "score_partiel":   round(s_moustiques, 4),
                "poids":           POIDS_MOUSTIQUES,
            },
            "meteo": {
                "donnees":       weather,
                "score_partiel": round(s_meteo, 4),
                "poids":         POIDS_METEO,
            },
        },
    }

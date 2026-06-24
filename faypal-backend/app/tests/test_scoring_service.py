"""
Tests unitaires de l'algorithme de calcul du score de risque.
Aucune base de données requise — fonctions pures.
"""
import pytest
from app.services.scoring_service import (
    calculate_score,
    _score_moustiques,
    _score_meteo,
    _niveau_risque,
    MAX_VECTEURS,
)

# ── Score moustiques ───────────────────────────────────────────────────────────

def test_score_moustiques_zero():
    assert _score_moustiques(0) == 0.0


def test_score_moustiques_milieu():
    assert _score_moustiques(25) == pytest.approx(0.5)


def test_score_moustiques_maximum():
    assert _score_moustiques(MAX_VECTEURS) == 1.0


def test_score_moustiques_plafond():
    """Au-delà du seuil, le score est plafonné à 1.0."""
    assert _score_moustiques(MAX_VECTEURS * 10) == 1.0


# ── Score météo ────────────────────────────────────────────────────────────────

def test_score_meteo_none():
    """Si la météo est indisponible, le score vaut 0."""
    assert _score_meteo(None) == 0.0


def test_score_meteo_temperature_optimale():
    """Température dans la plage 25–32°C → contribution maximale."""
    score = _score_meteo({"temperature": 28, "humidity": 0, "precipitation": 0})
    assert score == pytest.approx(0.4)


def test_score_meteo_temperature_acceptable():
    """Température entre 20 et 25°C → contribution partielle."""
    score = _score_meteo({"temperature": 22, "humidity": 0, "precipitation": 0})
    assert score == pytest.approx(0.2)


def test_score_meteo_temperature_froide():
    """Température < 20°C → aucune contribution."""
    score = _score_meteo({"temperature": 15, "humidity": 0, "precipitation": 0})
    assert score == pytest.approx(0.0)


def test_score_meteo_humidite_sous_seuil():
    """Humidité < 70% → aucune contribution."""
    score = _score_meteo({"temperature": 0, "humidity": 60, "precipitation": 0})
    assert score == pytest.approx(0.0)


def test_score_meteo_humidite_au_seuil():
    """Humidité = 70% → contribution minimale (0.0)."""
    score = _score_meteo({"temperature": 0, "humidity": 70, "precipitation": 0})
    assert score == pytest.approx(0.0)


def test_score_meteo_humidite_max():
    """Humidité = 100% → contribution maximale (+0.40)."""
    score = _score_meteo({"temperature": 0, "humidity": 100, "precipitation": 0})
    assert score == pytest.approx(0.4)


def test_score_meteo_pluie_forte():
    """Précipitations ≥ 5mm → contribution maximale (+0.20)."""
    score = _score_meteo({"temperature": 0, "humidity": 0, "precipitation": 8})
    assert score == pytest.approx(0.2)


def test_score_meteo_pluie_faible():
    """Précipitations entre 0 et 5mm → contribution partielle (+0.10)."""
    score = _score_meteo({"temperature": 0, "humidity": 0, "precipitation": 2})
    assert score == pytest.approx(0.1)


def test_score_meteo_pas_de_pluie():
    """Pas de précipitations → aucune contribution."""
    score = _score_meteo({"temperature": 0, "humidity": 0, "precipitation": 0})
    assert score == pytest.approx(0.0)


def test_score_meteo_plafond_a_1():
    """Le score météo ne peut pas dépasser 1.0."""
    score = _score_meteo({"temperature": 30, "humidity": 100, "precipitation": 10})
    assert score <= 1.0


def test_score_meteo_champs_manquants():
    """Les champs None dans le dict météo sont traités comme 0."""
    score = _score_meteo({"temperature": None, "humidity": None, "precipitation": None})
    assert score == pytest.approx(0.0)


# ── Niveaux de risque ──────────────────────────────────────────────────────────

@pytest.mark.parametrize("score, niveau_attendu", [
    (0.00, "faible"),
    (0.25, "faible"),
    (0.26, "modere"),
    (0.50, "modere"),
    (0.51, "eleve"),
    (0.75, "eleve"),
    (0.76, "critique"),
    (1.00, "critique"),
])
def test_niveaux_de_risque(score, niveau_attendu):
    assert _niveau_risque(score) == niveau_attendu


# ── Calcul complet ─────────────────────────────────────────────────────────────

def test_calculate_score_zone_calme():
    """Zone avec peu de moustiques et conditions climatiques défavorables."""
    r = calculate_score(nb_vecteurs=2, weather={"temperature": 18, "humidity": 50, "precipitation": 0})
    assert r["score"] < 0.10
    assert r["niveau_risque"] == "faible"
    assert "moustiques" in r["facteurs"]
    assert "meteo" in r["facteurs"]


def test_calculate_score_zone_critique():
    """Zone avec beaucoup de moustiques et pleine saison des pluies."""
    r = calculate_score(nb_vecteurs=50, weather={"temperature": 30, "humidity": 95, "precipitation": 10})
    assert r["score"] > 0.75
    assert r["niveau_risque"] == "critique"


def test_calculate_score_sans_meteo():
    """Si la météo est None, le calcul continue avec uniquement les moustiques."""
    r = calculate_score(nb_vecteurs=25, weather=None)
    assert r["score"] == pytest.approx(0.60 * 0.5, abs=0.01)
    assert r["niveau_risque"] == "modere"


def test_calculate_score_score_entre_0_et_1():
    """Le score final est toujours compris entre 0 et 1."""
    r = calculate_score(nb_vecteurs=1000, weather={"temperature": 30, "humidity": 100, "precipitation": 100})
    assert 0.0 <= r["score"] <= 1.0


def test_calculate_score_facteurs_contient_details():
    """Les facteurs retournés contiennent les informations d'audit."""
    r = calculate_score(nb_vecteurs=10, weather={"temperature": 28, "humidity": 80, "precipitation": 6})
    assert r["facteurs"]["moustiques"]["nb_vecteurs_24h"] == 10
    assert r["facteurs"]["moustiques"]["poids"] == 0.60
    assert r["facteurs"]["meteo"]["poids"] == 0.40

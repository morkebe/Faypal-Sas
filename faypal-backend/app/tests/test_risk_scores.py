"""
Tests des endpoints scores de risque, dont le déclenchement du pipeline.
"""
import uuid
from unittest.mock import patch, MagicMock

from app.tests.conftest import make_score, make_zone, ZONE_ID, SCORE_ID


def test_get_scores_retourne_liste(client_admin):
    client, db = client_admin
    db.query.return_value.order_by.return_value.all.return_value = [make_score()]

    resp = client.get("/scores/")

    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_scores_par_zone(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [
        make_score(), make_score(score=0.4)
    ]

    resp = client.get(f"/scores/zone/{ZONE_ID}")

    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_scores_par_zone_vide(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

    resp = client.get(f"/scores/zone/{ZONE_ID}")

    assert resp.status_code == 404


def test_get_dernier_score(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = make_score()

    resp = client.get(f"/scores/zone/{ZONE_ID}/dernier")

    assert resp.status_code == 200
    assert resp.json()["score"] == 0.82


def test_get_dernier_score_non_trouve(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None

    resp = client.get(f"/scores/zone/{uuid.uuid4()}/dernier")

    assert resp.status_code == 404


def test_create_score_manuel(client_admin):
    client, db = client_admin

    resp = client.post("/scores/", json={
        "zone_id": str(ZONE_ID),
        "score": 0.65,
        "niveau_risque": "eleve",
        "version_algo": "v1.0",
    })

    assert resp.status_code == 201
    db.add.assert_called_once()


def test_calculer_score_zone_non_trouvee(client_admin):
    """Le pipeline lève une ValueError si la zone n'existe pas."""
    client, db = client_admin

    with patch("app.workers.scoring_worker.run", side_effect=ValueError("Zone introuvable")):
        resp = client.post(f"/scores/calculer/{uuid.uuid4()}")

    assert resp.status_code == 404
    assert "introuvable" in resp.json()["detail"]


def test_calculer_score_pipeline_complet(client_admin):
    """Le pipeline complet retourne un score et indique si une alerte a été créée."""
    client, db = client_admin
    fake_score = make_score(score=0.85, niveau_risque="critique")
    fake_meteo = {"temperature": 30.0, "humidity": 90, "precipitation": 8.0}

    with patch("app.workers.scoring_worker.run", return_value={
        "score": fake_score,
        "alerte_creee": True,
        "meteo": fake_meteo,
    }):
        resp = client.post(f"/scores/calculer/{ZONE_ID}")

    assert resp.status_code == 201
    data = resp.json()
    assert data["score"]["score"] == 0.85
    assert data["alerte_creee"] is True
    assert data["meteo"]["temperature"] == 30.0

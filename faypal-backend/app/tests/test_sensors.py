"""
Tests des endpoints capteurs, dont la réception de données Moustibox.
"""
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.tests.conftest import make_sensor, SENSOR_ID, ZONE_ID


def test_get_sensors_retourne_liste(client_admin):
    client, db = client_admin
    db.query.return_value.all.return_value = [make_sensor(), make_sensor(numero_serie="SN-002")]

    resp = client.get("/sensors/")

    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_sensor_par_id_non_trouve(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.first.return_value = None

    resp = client.get(f"/sensors/{uuid.uuid4()}")

    assert resp.status_code == 404


def test_get_sensors_par_zone(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.all.return_value = [make_sensor()]

    resp = client.get(f"/sensors/zone/{ZONE_ID}")

    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_sensors_par_zone_vide(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.all.return_value = []

    resp = client.get(f"/sensors/zone/{ZONE_ID}")

    assert resp.status_code == 404


def test_create_sensor_succes(client_admin):
    client, db = client_admin

    resp = client.post("/sensors/", json={
        "zone_id": str(ZONE_ID),
        "numero_serie": "SN-999",
        "modele": "Moustibox V2",
        "statut": "actif",
    })

    assert resp.status_code == 201
    db.add.assert_called_once()


def test_update_statut_valide(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.first.return_value = make_sensor()

    resp = client.patch(f"/sensors/{SENSOR_ID}/statut", params={"statut": "maintenance"})

    assert resp.status_code == 200


def test_update_statut_invalide(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.first.return_value = make_sensor()

    resp = client.patch(f"/sensors/{SENSOR_ID}/statut", params={"statut": "casse"})

    assert resp.status_code == 400


# ── Réception données Moustibox ────────────────────────────────────────────────

def test_recevoir_donnees_capteur_inconnu(client_no_auth):
    """Moustibox inconnu → 404."""
    client, db = client_no_auth
    db.query.return_value.filter.return_value.first.return_value = None

    resp = client.post(f"/sensors/{uuid.uuid4()}/data", json={
        "detections": [{"nom_scientifique": "anopheles gambiae", "nombre": 5}]
    })

    assert resp.status_code == 404


def test_recevoir_donnees_capteur_inactif(client_no_auth):
    """Moustibox en maintenance → 403."""
    client, db = client_no_auth
    db.query.return_value.filter.return_value.first.return_value = make_sensor(statut="maintenance")

    resp = client.post(f"/sensors/{SENSOR_ID}/data", json={
        "detections": [{"nom_scientifique": "anopheles gambiae", "nombre": 5}]
    })

    assert resp.status_code == 403
    assert "maintenance" in resp.json()["detail"]


def test_recevoir_donnees_espece_inconnue_ignoree(client_no_auth):
    """Espèce non référencée en base → ignorée proprement, pas d'erreur."""
    client, db = client_no_auth
    sensor = make_sensor(statut="actif")

    # Premier appel → sensor, deuxième appel → espèce inconnue (None)
    db.query.return_value.filter.return_value.first.side_effect = [sensor, None]

    resp = client.post(f"/sensors/{SENSOR_ID}/data", json={
        "detections": [{"nom_scientifique": "espece_inconnue", "nombre": 3}]
    })

    # Pas d'erreur 500 — l'espèce inconnue est simplement ignorée
    assert resp.status_code == 201
    data = resp.json()
    assert data["nb_detections"] == 0   # aucune détection valide
    assert data["nb_vecteurs"] == 0

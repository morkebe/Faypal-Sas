"""
Tests des endpoints de gestion des alertes sanitaires.
"""
import uuid
from app.tests.conftest import make_alert, ALERT_ID, ZONE_ID


def test_get_alerts_retourne_liste(client_admin):
    client, db = client_admin
    db.query.return_value.order_by.return_value.all.return_value = [
        make_alert(), make_alert(statut="vue")
    ]

    resp = client.get("/alerts/")

    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_alerts_actives(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [
        make_alert(statut="creee")
    ]

    resp = client.get("/alerts/actives")

    assert resp.status_code == 200
    assert resp.json()[0]["statut"] == "creee"


def test_get_alerts_par_zone(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

    resp = client.get(f"/alerts/zone/{ZONE_ID}")

    assert resp.status_code == 200


def test_create_alert_succes(client_admin):
    client, db = client_admin

    resp = client.post("/alerts/", json={
        "zone_id": str(ZONE_ID),
        "type": "risque_critique",
        "severite": "critique",
        "message": "Test alerte",
    })

    assert resp.status_code == 201
    db.add.assert_called_once()


def test_acquitter_alert_non_trouvee(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.first.return_value = None

    resp = client.patch(f"/alerts/{uuid.uuid4()}/acquitter")

    assert resp.status_code == 404
    assert "introuvable" in resp.json()["detail"]


def test_acquitter_alert_succes(client_admin):
    client, db = client_admin
    alerte = make_alert(statut="creee")
    db.query.return_value.filter.return_value.first.return_value = alerte

    resp = client.patch(f"/alerts/{ALERT_ID}/acquitter")

    assert resp.status_code == 200
    assert alerte.statut == "acquittee"
    assert alerte.acquittee_a is not None

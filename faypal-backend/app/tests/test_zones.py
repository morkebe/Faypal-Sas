"""
Tests des endpoints de gestion des zones géographiques.
"""
from app.tests.conftest import make_zone, ZONE_ID


def test_get_zones_liste_vide(client_admin):
    client, db = client_admin
    db.query.return_value.all.return_value = []

    resp = client.get("/zones/")

    assert resp.status_code == 200
    assert resp.json() == []


def test_get_zones_retourne_les_zones(client_admin):
    client, db = client_admin
    db.query.return_value.all.return_value = [make_zone(), make_zone(nom="Thiès")]

    resp = client.get("/zones/")

    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_zone_par_id_trouvee(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.first.return_value = make_zone()

    resp = client.get(f"/zones/{ZONE_ID}")

    assert resp.status_code == 200
    assert resp.json()["nom"] == "Dakar Plateau"


def test_get_zone_par_id_non_trouvee(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.first.return_value = None

    import uuid
    resp = client.get(f"/zones/{uuid.uuid4()}")

    assert resp.status_code == 404
    assert "introuvable" in resp.json()["detail"]


def test_get_zones_par_niveau_trouvees(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.all.return_value = [make_zone(niveau="region")]

    resp = client.get("/zones/niveau/region")

    assert resp.status_code == 200
    assert resp.json()[0]["niveau"] == "region"


def test_get_zones_par_niveau_aucune(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.all.return_value = []

    resp = client.get("/zones/niveau/inexistant")

    assert resp.status_code == 404


def test_create_zone_succes(client_admin):
    client, db = client_admin

    resp = client.post("/zones/", json={
        "nom": "Rufisque",
        "niveau": "district",
    })

    assert resp.status_code == 201
    db.add.assert_called_once()
    db.commit.assert_called_once()


def test_delete_zone_non_trouvee(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.first.return_value = None

    import uuid
    resp = client.delete(f"/zones/{uuid.uuid4()}")

    assert resp.status_code == 404


def test_delete_zone_succes(client_admin):
    client, db = client_admin
    db.query.return_value.filter.return_value.first.return_value = make_zone()

    resp = client.delete(f"/zones/{ZONE_ID}")

    assert resp.status_code == 204
    db.delete.assert_called_once()

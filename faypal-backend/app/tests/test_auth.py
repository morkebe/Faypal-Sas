"""
Tests des endpoints d'authentification : register et login.
"""
from unittest.mock import MagicMock
from app.tests.conftest import make_user


def test_register_succes(client_no_auth):
    client, db = client_no_auth
    # Aucun utilisateur existant avec cet email
    db.query.return_value.filter.return_value.first.return_value = None

    resp = client.post("/auth/register", json={
        "email": "nouveau@faypal.sn",
        "mot_de_passe": "monmotdepasse",
        "nom_complet": "Nouveau User",
        "role": "lecteur",
    })

    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "nouveau@faypal.sn"
    assert data["role"] == "lecteur"


def test_register_email_deja_utilise(client_no_auth):
    client, db = client_no_auth
    # Un utilisateur existe déjà avec cet email
    db.query.return_value.filter.return_value.first.return_value = make_user()

    resp = client.post("/auth/register", json={
        "email": "admin@faypal.sn",
        "mot_de_passe": "monmotdepasse",
        "nom_complet": "Doublon",
        "role": "lecteur",
    })

    assert resp.status_code == 400
    assert "déjà utilisé" in resp.json()["detail"]


def test_login_succes(client_no_auth):
    client, db = client_no_auth
    from app.auth.security import hash_password
    fake = make_user()
    fake.mot_de_passe_hash = hash_password("bonmotdepasse")
    fake.actif = True
    db.query.return_value.filter.return_value.first.return_value = fake

    resp = client.post("/auth/login", data={
        "username": "admin@faypal.sn",
        "password": "bonmotdepasse",
    })

    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_mauvais_mot_de_passe(client_no_auth):
    client, db = client_no_auth
    from app.auth.security import hash_password
    fake = make_user()
    fake.mot_de_passe_hash = hash_password("bonmotdepasse")
    db.query.return_value.filter.return_value.first.return_value = fake

    resp = client.post("/auth/login", data={
        "username": "admin@faypal.sn",
        "password": "mauvaismdp",
    })

    assert resp.status_code == 401


def test_login_utilisateur_inconnu(client_no_auth):
    client, db = client_no_auth
    db.query.return_value.filter.return_value.first.return_value = None

    resp = client.post("/auth/login", data={
        "username": "inconnu@faypal.sn",
        "password": "mdp",
    })

    assert resp.status_code == 401


def test_login_compte_desactive(client_no_auth):
    client, db = client_no_auth
    from app.auth.security import hash_password
    fake = make_user()
    fake.mot_de_passe_hash = hash_password("bonmotdepasse")
    fake.actif = False
    db.query.return_value.filter.return_value.first.return_value = fake

    resp = client.post("/auth/login", data={
        "username": "admin@faypal.sn",
        "password": "bonmotdepasse",
    })

    assert resp.status_code == 403

"""
Tests unitaires pour le module de sécurité : hash bcrypt et tokens JWT.
"""
import uuid
import pytest
from jose import JWTError

from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)


# ── Hash mot de passe ──────────────────────────────────────────────────────────

def test_hash_password_retourne_une_chaine():
    h = hash_password("monmotdepasse")
    assert isinstance(h, str)
    assert len(h) > 0


def test_hash_password_different_du_mot_de_passe_en_clair():
    mdp = "monmotdepasse"
    assert hash_password(mdp) != mdp


def test_hash_password_deux_hashs_differents():
    """Même mot de passe → deux hash différents (salt aléatoire)."""
    h1 = hash_password("secret")
    h2 = hash_password("secret")
    assert h1 != h2


def test_verify_password_correct():
    mdp = "motdepasse123"
    h = hash_password(mdp)
    assert verify_password(mdp, h) is True


def test_verify_password_incorrect():
    h = hash_password("bonmotdepasse")
    assert verify_password("mauvais", h) is False


# ── Token JWT ──────────────────────────────────────────────────────────────────

def test_create_token_retourne_une_chaine():
    token = create_access_token({"sub": str(uuid.uuid4())})
    assert isinstance(token, str)
    assert len(token) > 0


def test_decode_token_retourne_le_payload():
    user_id = str(uuid.uuid4())
    token = create_access_token({"sub": user_id, "role": "admin"})
    payload = decode_token(token)
    assert payload["sub"] == user_id
    assert payload["role"] == "admin"


def test_decode_token_contient_exp():
    token = create_access_token({"sub": "test"})
    payload = decode_token(token)
    assert "exp" in payload


def test_decode_token_invalide_leve_erreur():
    with pytest.raises(JWTError):
        decode_token("token.totalement.invalide")


def test_decode_token_falsifie_leve_erreur():
    token = create_access_token({"sub": "user"})
    token_falsifie = token[:-5] + "XXXXX"
    with pytest.raises(JWTError):
        decode_token(token_falsifie)

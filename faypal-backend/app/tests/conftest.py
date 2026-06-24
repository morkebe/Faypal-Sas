"""
Fixtures partagées entre tous les fichiers de test.
"""
import uuid
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.dependencies import get_current_user
from app.main import app

# ── IDs fixes pour les tests ───────────────────────────────────────────────────
ZONE_ID   = uuid.uuid4()
SENSOR_ID = uuid.uuid4()
ALERT_ID  = uuid.uuid4()
SCORE_ID  = uuid.uuid4()
USER_ID   = uuid.uuid4()


# ── Objets factices (SimpleNamespace = compatible Pydantic from_attributes) ────

def make_zone(**kwargs) -> SimpleNamespace:
    defaults = dict(
        id=ZONE_ID, nom="Dakar Plateau", niveau="quartier",
        parent_id=None, created_at=datetime.now(), metadata_=None,
    )
    return SimpleNamespace(**{**defaults, **kwargs})


def make_sensor(**kwargs) -> SimpleNamespace:
    defaults = dict(
        id=SENSOR_ID, zone_id=ZONE_ID, numero_serie="SN-001",
        modele="Moustibox V1", statut="actif",
        installe_le=datetime.now(), vu_le=None,
    )
    return SimpleNamespace(**{**defaults, **kwargs})


def make_alert(**kwargs) -> SimpleNamespace:
    defaults = dict(
        id=ALERT_ID, zone_id=ZONE_ID, score_id=SCORE_ID,
        type="risque_critique", severite="critique",
        message="Score critique détecté.", statut="creee",
        declenchee_a=datetime.now(), acquittee_a=None,
    )
    return SimpleNamespace(**{**defaults, **kwargs})


def make_score(**kwargs) -> SimpleNamespace:
    defaults = dict(
        id=SCORE_ID, zone_id=ZONE_ID, score=0.82,
        niveau_risque="critique", facteurs={},
        version_algo="v1.0", calcule_a=datetime.now(),
    )
    return SimpleNamespace(**{**defaults, **kwargs})


def make_user(**kwargs) -> SimpleNamespace:
    defaults = dict(
        id=USER_ID, email="admin@faypal.sn", nom_complet="Admin",
        role="admin", actif=True, cree_le=datetime.now(),
    )
    return SimpleNamespace(**{**defaults, **kwargs})


# ── Mock DB ────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """
    Base de données entièrement mockée.

    db.add()   → traque les objets ajoutés
    db.flush() → assigne un id aux objets ajoutés (simule le comportement PostgreSQL)
    db.refresh()→ complète les champs avec valeurs par défaut selon le type de table
    """
    db = MagicMock()
    _added = []

    # Traque chaque objet ajouté
    def _add(obj):
        _added.append(obj)
    db.add.side_effect = _add

    # Simule le flush : assigne les ids manquants
    def _flush():
        for obj in _added:
            if getattr(obj, "id", None) is None:
                try:
                    obj.id = uuid.uuid4()
                except Exception:
                    pass
    db.flush.side_effect = _flush

    # Simule le refresh : complète tous les champs avec valeurs par défaut
    def _refresh(obj):
        tablename = getattr(type(obj), "__tablename__", "")
        now = datetime.now()

        def try_set(attr, value):
            try:
                if getattr(obj, attr, None) is None:
                    setattr(obj, attr, value)
            except Exception:
                pass

        # ID universel
        try_set("id", uuid.uuid4())

        # Timestamps (chaque modèle a son propre nom)
        for ts in ["created_at", "cree_le", "calcule_a",
                   "declenchee_a", "installe_le", "capture_a"]:
            try_set(ts, now)

        # Valeurs par défaut spécifiques à chaque table
        table_defaults = {
            "alerts":      {"statut": "creee"},
            "sensors":     {"statut": "actif"},
            "users":       {"role": "lecteur", "actif": True},
            "risk_scores": {"version_algo": "v1.0"},
        }
        for attr, val in table_defaults.get(tablename, {}).items():
            try_set(attr, val)

    db.refresh.side_effect = _refresh
    return db


# ── Clients HTTP ───────────────────────────────────────────────────────────────

@pytest.fixture
def client_admin(mock_db):
    """TestClient authentifié en tant qu'admin."""
    admin = make_user(role="admin")
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: admin
    with TestClient(app) as c:
        yield c, mock_db
    app.dependency_overrides.clear()


@pytest.fixture
def client_no_auth(mock_db):
    """TestClient sans JWT — pour /auth/* et /sensors/{id}/data."""
    app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(app) as c:
        yield c, mock_db
    app.dependency_overrides.clear()

"""
Script de seed — crée les 8 utilisateurs de démonstration Faypal.
Mot de passe commun : Faypal2025!

Usage:
  python seed.py
"""
import sys
from app.database import SessionLocal
from app.models.user import User
from app.auth.security import hash_password

USERS = [
    {"email": "mamadou.sy@msas.gouv.sn",  "nom_complet": "Dr. Mamadou Sy",     "role": "admin",         "actif": True  },
    {"email": "a.diallo@msas.gouv.sn",    "nom_complet": "Dr. Aminata Diallo", "role": "analyste",      "actif": True  },
    {"email": "i.ndiaye@ird.sn",          "nom_complet": "Ibrahim Ndiaye",     "role": "agent_terrain", "actif": True  },
    {"email": "f.cisse@pasteur.sn",       "nom_complet": "Dr. Fatou Cissé",    "role": "analyste",      "actif": True  },
    {"email": "m.sarr@msas.gouv.sn",      "nom_complet": "Moussa Sarr",        "role": "lecteur",       "actif": True  },
    {"email": "c.ba@who.int",             "nom_complet": "Dr. Cheikh Ba",      "role": "agent_terrain", "actif": True  },
    {"email": "r.faye@msas.gouv.sn",      "nom_complet": "Rokhaya Faye",       "role": "lecteur",       "actif": False },
    {"email": "o.dieng@ucad.edu.sn",      "nom_complet": "Dr. Omar Dieng",     "role": "agent_terrain", "actif": False },
]

PASSWORD = "Faypal2025!"

def seed():
    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        for u in USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                print(f"  [skip]    {u['email']} — déjà présent")
                skipped += 1
                continue
            user = User(
                email             = u["email"],
                nom_complet       = u["nom_complet"],
                role              = u["role"],
                actif             = u["actif"],
                mot_de_passe_hash = hash_password(PASSWORD),
            )
            db.add(user)
            created += 1
            print(f"  [created] {u['email']} ({u['role']})")
        db.commit()
        print(f"\n✓ {created} utilisateur(s) créé(s), {skipped} ignoré(s).")
        print(f"  Mot de passe commun : {PASSWORD}")
    except Exception as e:
        db.rollback()
        print(f"\n✗ Erreur : {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed()

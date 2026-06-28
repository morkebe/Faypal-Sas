"""
Crée un administrateur par défaut si aucun n'existe encore.
Variables d'environnement utilisées :
  ADMIN_EMAIL     (défaut : admin@faypal.sn)
  ADMIN_PASSWORD  (défaut : Faypal2025!)
  ADMIN_NOM       (défaut : Administrateur)
"""
import os
import sys
from app.database import SessionLocal
from app.models.user import User
from app.auth.security import hash_password

def init_admin() -> None:
    email    = os.getenv("ADMIN_EMAIL",    "admin@faypal.sn")
    password = os.getenv("ADMIN_PASSWORD", "Faypal2025!")
    nom      = os.getenv("ADMIN_NOM",      "Administrateur")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == "admin").first()
        if existing:
            print(f"[init_admin] Admin déjà présent : {existing.email}")
            return

        user = User(
            email             = email,
            nom_complet       = nom,
            role              = "admin",
            actif             = True,
            mot_de_passe_hash = hash_password(password),
        )
        db.add(user)
        db.commit()
        print(f"[init_admin] Admin créé : {email}")
    except Exception as e:
        db.rollback()
        print(f"[init_admin] Erreur : {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    init_admin()

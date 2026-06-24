from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import hash_password, verify_password
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserResponse, UserRoleUpdate, PasswordChange

router = APIRouter(prefix="/users", tags=["Utilisateurs"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return current_user


@router.patch("/me/password", status_code=204)
def change_password(
    body: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change le mot de passe de l'utilisateur connecté."""
    if not verify_password(body.mot_de_passe_actuel, current_user.mot_de_passe_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    if len(body.nouveau_mot_de_passe) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères")
    current_user.mot_de_passe_hash = hash_password(body.nouveau_mot_de_passe)
    db.commit()


@router.get("/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Liste tous les utilisateurs — réservé à l'admin."""
    return db.query(User).all()


VALID_ROLES = {"admin", "analyste", "agent_terrain", "lecteur"}

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: UUID,
    body: UserRoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Change le rôle d'un utilisateur — admin uniquement."""
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Valeurs acceptées : {', '.join(VALID_ROLES)}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.role = body.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/actif", response_model=UserResponse)
def toggle_actif(
    user_id: UUID,
    actif: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Active ou désactive un compte utilisateur — admin uniquement."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de modifier son propre statut")
    user.actif = actif
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Détails d'un utilisateur par son ID — réservé à l'admin."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user

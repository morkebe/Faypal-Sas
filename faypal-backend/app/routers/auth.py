import random
from datetime import timedelta, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth.security import create_access_token, hash_password, verify_password
from app.config import get_settings
from app.database import get_db
from app.models.pending_registration import PendingRegistration
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.services.email import send_verification_email

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentification"])


class InitiateRegisterInput(BaseModel):
    email: EmailStr
    mot_de_passe: str
    nom_complet: Optional[str] = None

class VerifyEmailInput(BaseModel):
    email: EmailStr
    code: str


# ── Inscription classique (seed / admin) ──────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cet email est deja utilise")
    new_user = User(
        email=user_data.email,
        mot_de_passe_hash=hash_password(user_data.mot_de_passe),
        nom_complet=user_data.nom_complet,
        role=user_data.role or "lecteur",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ── Inscription en 2 etapes ───────────────────────────────────────────────────

@router.post("/register/initiate", status_code=202)
def register_initiate(data: InitiateRegisterInput, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Cet email est deja utilise")

    if len(data.mot_de_passe) < 8:
        raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins 8 caracteres")

    code = f"{random.randint(0, 999999):06d}"
    expires_at = datetime.now() + timedelta(minutes=10)
    password_hash = hash_password(data.mot_de_passe)

    pending = db.query(PendingRegistration).filter(PendingRegistration.email == data.email).first()
    if pending:
        pending.code = code
        pending.expires_at = expires_at
        pending.mot_de_passe_hash = password_hash
        pending.nom_complet = data.nom_complet
    else:
        pending = PendingRegistration(
            email=data.email,
            nom_complet=data.nom_complet,
            mot_de_passe_hash=password_hash,
            code=code,
            expires_at=expires_at,
        )
        db.add(pending)

    db.commit()

    try:
        send_verification_email(data.email, code, data.nom_complet)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi de l'email : {exc}")

    return {"message": "Code envoye a votre adresse email"}


@router.post("/register/verify")
def register_verify(data: VerifyEmailInput, db: Session = Depends(get_db)):
    pending = db.query(PendingRegistration).filter(PendingRegistration.email == data.email).first()

    if not pending:
        raise HTTPException(status_code=404, detail="Aucune inscription en attente pour cet email")

    if datetime.now() > pending.expires_at:
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=410, detail="Code expire. Veuillez recommencer l'inscription")

    if pending.code != data.code:
        raise HTTPException(status_code=400, detail="Code incorrect")

    new_user = User(
        email=pending.email,
        mot_de_passe_hash=pending.mot_de_passe_hash,
        nom_complet=pending.nom_complet,
        role=pending.role,
        actif=True,
    )
    db.add(new_user)
    db.delete(pending)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        data={"sub": str(new_user.id), "role": new_user.role},
        expires_delta=timedelta(hours=24),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "nom_complet": new_user.nom_complet,
            "role": new_user.role,
        },
    }


# ── Connexion ─────────────────────────────────────────────────────────────────

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.actif:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce compte a ete desactive")

    user.derniere_connexion = datetime.now()
    db.commit()

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {"access_token": token, "token_type": "bearer"}

from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    nom_complet: Optional[str] = None
    role: Optional[str] = "lecteur"

class UserCreate(UserBase):
    mot_de_passe: str

class UserRoleUpdate(BaseModel):
    role: str

class PasswordChange(BaseModel):
    mot_de_passe_actuel: str
    nouveau_mot_de_passe: str

class UserResponse(UserBase):
    id: UUID
    actif: bool
    cree_le: datetime
    derniere_connexion: Optional[datetime] = None

    class Config:
        from_attributes = True
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email             = Column(String(200), unique=True, nullable=False)
    mot_de_passe_hash = Column(String(255), nullable=False)
    role              = Column(String(50), default="lecteur")
    nom_complet       = Column(String(200))
    actif             = Column(Boolean, default=True)
    cree_le           = Column(DateTime, server_default=func.now())
    derniere_connexion = Column(DateTime, nullable=True)

    # Relations
    zones      = relationship("UserZone", back_populates="user")
    recipients = relationship("AlertRecipient", back_populates="user")
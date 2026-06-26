from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base


class PendingRegistration(Base):
    __tablename__ = "pending_registrations"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email             = Column(String(200), unique=True, nullable=False)
    nom_complet       = Column(String(200), nullable=True)
    mot_de_passe_hash = Column(String(255), nullable=False)
    role              = Column(String(50), default="lecteur")
    code              = Column(String(6), nullable=False)
    expires_at        = Column(DateTime, nullable=False)
    cree_le           = Column(DateTime, server_default=func.now())

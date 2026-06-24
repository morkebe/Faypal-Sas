from sqlalchemy import Column, String, Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class MosquitoSpecies(Base):
    __tablename__ = "mosquito_species"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom_commun         = Column(String(150), nullable=False)
    nom_scientifique   = Column(String(150), unique=True, nullable=False)
    vecteur_paludisme  = Column(Boolean, default=False)
    niveau_danger      = Column(Integer)
    description        = Column(Text)

    # Relations
    detections = relationship("SensorDetection", back_populates="species")
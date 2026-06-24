from sqlalchemy import Column, String, DateTime, ForeignKey
from geoalchemy2 import Geometry
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Zone(Base):
    __tablename__ = "zones"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom        = Column(String(150), nullable=False)
    niveau     = Column(String(50), nullable=False)
    parent_id  = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True)
    metadata_  = Column("metadata", JSONB, nullable=True)
    geom       = Column(Geometry('MULTIPOLYGON', srid=4326), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relations
    parent      = relationship("Zone", remote_side=[id], backref="sous_zones")
    sensors     = relationship("Sensor", back_populates="zone")
    risk_scores = relationship("RiskScore", back_populates="zone")
    alerts      = relationship("Alert", back_populates="zone")
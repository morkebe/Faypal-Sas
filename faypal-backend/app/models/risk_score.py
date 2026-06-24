from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id       = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=False)
    score         = Column(Float, nullable=False)
    niveau_risque = Column(String(50))
    facteurs      = Column(JSONB)
    version_algo  = Column(String(50), default="v1.0")
    calcule_a     = Column(DateTime, server_default=func.now())

    # Relations
    zone  = relationship("Zone", back_populates="risk_scores")
    alert = relationship("Alert", back_populates="score")
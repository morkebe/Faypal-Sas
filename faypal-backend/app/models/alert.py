from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id      = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=False)
    score_id     = Column(UUID(as_uuid=True), ForeignKey("risk_scores.id"), nullable=True)
    type         = Column(String(100), nullable=False)
    severite     = Column(String(50))
    message      = Column(Text)
    statut       = Column(String(50), default="creee")
    declenchee_a = Column(DateTime, server_default=func.now())
    acquittee_a  = Column(DateTime, nullable=True)

    # Relations
    zone       = relationship("Zone", back_populates="alerts")
    score      = relationship("RiskScore", back_populates="alert")
    recipients = relationship("AlertRecipient", back_populates="alert")
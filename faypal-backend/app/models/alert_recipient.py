from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class AlertRecipient(Base):
    __tablename__ = "alert_recipients"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id     = Column(UUID(as_uuid=True), ForeignKey("alerts.id"), nullable=False)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    canal        = Column(String(50), default="dashboard")
    statut_envoi = Column(String(50), default="en_attente")
    envoye_a     = Column(DateTime, nullable=True)

    # Relations
    alert = relationship("Alert", back_populates="recipients")
    user  = relationship("User", back_populates="recipients")
from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class UserZone(Base):
    __tablename__ = "user_zones"

    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    zone_id    = Column(UUID(as_uuid=True), ForeignKey("zones.id"), primary_key=True)
    assigne_le = Column(DateTime, server_default=func.now())

    # Relations
    user = relationship("User", back_populates="zones")
    zone = relationship("Zone")
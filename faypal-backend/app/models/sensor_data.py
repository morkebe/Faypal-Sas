from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class SensorData(Base):
    __tablename__ = "sensor_data"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sensor_id    = Column(UUID(as_uuid=True), ForeignKey("sensors.id"), nullable=False)
    payload_brut = Column(JSONB)
    capture_a    = Column(DateTime, nullable=False, server_default=func.now())

    # Relations
    sensor      = relationship("Sensor", back_populates="sensor_data")
    detections  = relationship("SensorDetection", back_populates="sensor_data")
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class SensorDetection(Base):
    __tablename__ = "sensor_detections"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sensor_data_id = Column(UUID(as_uuid=True), ForeignKey("sensor_data.id"), nullable=False)
    species_id     = Column(UUID(as_uuid=True), ForeignKey("mosquito_species.id"), nullable=False)
    nombre_detecte = Column(Integer, nullable=False)

    # Relations
    sensor_data = relationship("SensorData", back_populates="detections")
    species     = relationship("MosquitoSpecies", back_populates="detections")
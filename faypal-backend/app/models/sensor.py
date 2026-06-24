from sqlalchemy import Column, String, DateTime, ForeignKey
from geoalchemy2 import Geometry
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Sensor(Base):
    __tablename__ = "sensors"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id      = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=False)
    numero_serie = Column(String(100), unique=True, nullable=False)
    modele       = Column(String(100))
    statut       = Column(String(50), default="actif")
    localisation = Column(Geometry('POINT', srid=4326), nullable=True)
    installe_le  = Column(DateTime, server_default=func.now())
    vu_le        = Column(DateTime, nullable=True)

    # Relations
    zone        = relationship("Zone", back_populates="sensors")
    sensor_data = relationship("SensorData", back_populates="sensor")
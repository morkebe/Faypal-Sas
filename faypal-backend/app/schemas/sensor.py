from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class SensorBase(BaseModel):
    zone_id: UUID
    numero_serie: str
    modele: Optional[str] = None
    statut: Optional[str] = "actif"

class SensorCreate(SensorBase):
    pass

class SensorResponse(SensorBase):
    id: UUID
    installe_le: datetime
    vu_le: Optional[datetime] = None

    class Config:
        from_attributes = True
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class AlertBase(BaseModel):
    zone_id: UUID
    type: str
    severite: Optional[str] = None
    message: Optional[str] = None

class AlertCreate(AlertBase):
    score_id: Optional[UUID] = None

class AlertResponse(AlertBase):
    id: UUID
    statut: str
    declenchee_a: datetime
    acquittee_a: Optional[datetime] = None

    class Config:
        from_attributes = True
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ZoneBase(BaseModel):
    nom: str
    niveau: str
    parent_id: Optional[UUID] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneResponse(ZoneBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
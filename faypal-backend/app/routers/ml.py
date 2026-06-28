from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User
from app.services.ml_service import predict_multi_horizon, predict_v2, MLServiceUnavailableError

router = APIRouter(prefix="/ml", tags=["ML"])


class MultiHorizonRequest(BaseModel):
    region:  str
    semaine: int
    annee:   int = datetime.now().year


@router.post("/predict/multi-horizon")
def proxy_multi_horizon(
    body: MultiHorizonRequest,
    _: User = Depends(get_current_user),
):
    try:
        return predict_multi_horizon(body.region, body.semaine, body.annee)
    except MLServiceUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/predict/v2")
def proxy_predict_v2(
    body: MultiHorizonRequest,
    _: User = Depends(get_current_user),
):
    try:
        return predict_v2(body.region, body.semaine, body.annee)
    except MLServiceUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))

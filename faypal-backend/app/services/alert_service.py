from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.risk_score import RiskScore

# Seuils déclencheurs
SEUIL_CRITIQUE = 0.76
SEUIL_ELEVE    = 0.51


def check_and_create_alert(
    zone_id: UUID,
    risk_score: RiskScore,
    db: Session,
) -> Optional[Alert]:
    """
    Crée automatiquement une alerte si le score dépasse un seuil.

    - score >= 0.76 → alerte critique  (intervention urgente)
    - score >= 0.51 → alerte élevée    (surveillance renforcée)
    - score <  0.51 → aucune alerte

    Ne crée pas de doublon : si une alerte est déjà active (creee ou vue)
    pour cette zone, la fonction retourne None sans rien créer.
    """
    if risk_score.score < SEUIL_ELEVE:
        return None

    # Vérifier s'il existe déjà une alerte active pour cette zone
    alerte_active = db.query(Alert).filter(
        Alert.zone_id == zone_id,
        Alert.statut.in_(["creee", "vue"]),
    ).first()

    if alerte_active:
        return None

    # Construire le message selon le niveau
    if risk_score.score >= SEUIL_CRITIQUE:
        type_alerte = "risque_critique"
        severite    = "critique"
        message     = (
            f"Score de risque critique ({risk_score.score:.2f}) détecté. "
            "Intervention urgente recommandée."
        )
    else:
        type_alerte = "risque_eleve"
        severite    = "eleve"
        message     = (
            f"Score de risque élevé ({risk_score.score:.2f}) détecté. "
            "Surveillance renforcée recommandée."
        )

    alerte = Alert(
        zone_id  = zone_id,
        score_id = risk_score.id,
        type     = type_alerte,
        severite = severite,
        message  = message,
        statut   = "creee",
    )
    db.add(alerte)
    db.commit()
    db.refresh(alerte)
    return alerte

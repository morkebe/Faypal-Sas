from app.database import SessionLocal
from app.models.user import User
from app.models.zone import Zone
from app.models.sensor import Sensor
from app.models.sensor_data import SensorData
from app.models.sensor_detection import SensorDetection
from app.models.risk_score import RiskScore
from app.models.alert import Alert
from app.models.mosquito_species import MosquitoSpecies

db = SessionLocal()
print("Utilisateurs   :", db.query(User).count())
print("Zones totales  :", db.query(Zone).count())
print("  Regions      :", db.query(Zone).filter(Zone.niveau == "region").count())
print("  Districts    :", db.query(Zone).filter(Zone.niveau == "district").count())
print("Capteurs       :", db.query(Sensor).count())
print("Donnees capteur:", db.query(SensorData).count())
print("Detections     :", db.query(SensorDetection).count())
print("Scores risque  :", db.query(RiskScore).count())
print("Alertes        :", db.query(Alert).count())
print("Especes        :", db.query(MosquitoSpecies).count())

print("\n--- Utilisateurs ---")
for u in db.query(User).all():
    print(" ", u.email, "|", u.role, "| actif:", u.actif)

print("\n--- Scores de risque ---")
from app.models.zone import Zone
scores = db.query(RiskScore).all()
for s in scores:
    zone = db.query(Zone).filter(Zone.id == s.zone_id).first()
    print(" ", zone.nom if zone else "?", "| score:", round(s.score*100), "% |", s.niveau_risque)

print("\n--- Alertes ---")
for a in db.query(Alert).all():
    zone = db.query(Zone).filter(Zone.id == a.zone_id).first()
    print(" ", zone.nom if zone else "?", "|", a.type, "|", a.severite, "|", a.statut)

db.close()

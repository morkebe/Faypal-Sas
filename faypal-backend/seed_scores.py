"""
seed_scores.py — Peuple les capteurs, détections moustiques et scores de risque
pour les 14 régions du Sénégal, de façon à ce que le pipeline produise
des scores réalistes.

Exécuter : docker exec faypal_api python seed_scores.py
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.zone import Zone
from app.models.mosquito_species import MosquitoSpecies
from app.models.sensor import Sensor
from app.models.sensor_data import SensorData
from app.models.sensor_detection import SensorDetection
from app.workers.scoring_worker import run as calc_score

REGION_DATA = {
    "Kédougou":    {"lat": 12.5564, "lon": -12.1872, "device": "MB-01",  "mosquitoes": 134},
    "Tambacounda": {"lat": 13.7709, "lon": -13.6672, "device": "MB-03",  "mosquitoes": 112},
    "Kolda":       {"lat": 12.8989, "lon": -14.9406, "device": "MB-05",  "mosquitoes": 96},
    "Kaffrine":    {"lat": 14.1059, "lon": -15.5507, "device": "MB-KAF", "mosquitoes": 71},
    "Kaolack":     {"lat": 14.1521, "lon": -16.0726, "device": "MB-13",  "mosquitoes": 63},
    "Sédhiou":     {"lat": 12.7044, "lon": -15.5567, "device": "MB-SED", "mosquitoes": 57},
    "Ziguinchor":  {"lat": 12.5581, "lon": -16.2719, "device": "MB-ZIG", "mosquitoes": 44},
    "Matam":       {"lat": 15.6559, "lon": -13.2553, "device": "MB-09",  "mosquitoes": 39},
    "Fatick":      {"lat": 14.3394, "lon": -16.4117, "device": "MB-14",  "mosquitoes": 22},
    "Diourbel":    {"lat": 14.6549, "lon": -16.2322, "device": "MB-DIO", "mosquitoes": 31},
    "Thiès":       {"lat": 14.7911, "lon": -16.9259, "device": "MB-11",  "mosquitoes": 22},
    "Louga":       {"lat": 15.6173, "lon": -16.2240, "device": "MB-LOU", "mosquitoes": 14},
    "Dakar":       {"lat": 14.6937, "lon": -17.4441, "device": "MB-DAK", "mosquitoes": 8},
    "Saint-Louis": {"lat": 16.0179, "lon": -16.4896, "device": "MB-STL", "mosquitoes": 6},
}

db = SessionLocal()
try:
    # ── 1. Espèce vectrice ─────────────────────────────────────────────────────
    species = db.query(MosquitoSpecies).filter(
        MosquitoSpecies.nom_scientifique == "Anopheles gambiae"
    ).first()
    if not species:
        species = MosquitoSpecies(
            id=uuid.uuid4(),
            nom_commun="Moustique du paludisme",
            nom_scientifique="Anopheles gambiae",
            vecteur_paludisme=True,
            niveau_danger=5,
            description="Principal vecteur du paludisme en Afrique subsaharienne",
        )
        db.add(species)
        db.commit()
        db.refresh(species)
        print(f"✅ Espèce créée : {species.nom_scientifique}")
    else:
        print(f"ℹ️  Espèce existante : {species.nom_scientifique}")

    now = datetime.now(timezone.utc)

    # ── 2. Capteurs + détections ───────────────────────────────────────────────
    for nom, data in REGION_DATA.items():
        zone = db.query(Zone).filter(
            Zone.nom == nom, Zone.niveau == "region"
        ).first()
        if not zone:
            print(f"❌ Zone introuvable : {nom}")
            continue

        # Mise à jour GPS
        if not zone.metadata_ or "latitude" not in zone.metadata_:
            zone.metadata_ = {"latitude": data["lat"], "longitude": data["lon"]}
            db.add(zone)
            db.commit()
            print(f"📍 GPS ajouté : {nom} ({data['lat']}, {data['lon']})")

        # Capteur (idempotent)
        sensor = db.query(Sensor).filter(
            Sensor.numero_serie == data["device"]
        ).first()
        if not sensor:
            sensor = Sensor(
                id=uuid.uuid4(),
                zone_id=zone.id,
                numero_serie=data["device"],
                modele="MoustiBox v2",
                statut="actif",
                installe_le=now - timedelta(days=30),
            )
            db.add(sensor)
            db.commit()
            db.refresh(sensor)
            print(f"✅ Capteur créé : {data['device']} → {nom}")
        else:
            print(f"ℹ️  Capteur existant : {data['device']}")

        # Donnée capteur (capture il y a 1h pour être dans la fenêtre 24h)
        sd = SensorData(
            id=uuid.uuid4(),
            sensor_id=sensor.id,
            payload_brut={"source": "seed", "region": nom},
            capture_a=now - timedelta(hours=1),
        )
        db.add(sd)
        db.commit()
        db.refresh(sd)

        # Détection moustiques
        detection = SensorDetection(
            id=uuid.uuid4(),
            sensor_data_id=sd.id,
            species_id=species.id,
            nombre_detecte=data["mosquitoes"],
        )
        db.add(detection)
        db.commit()
        print(f"🦟 {nom} : {data['mosquitoes']} Anopheles enregistrés")

    # ── 3. Calcul des scores pour toutes les régions ───────────────────────────
    print("\n⚙️  Calcul des scores de risque...")
    for nom in REGION_DATA:
        zone = db.query(Zone).filter(
            Zone.nom == nom, Zone.niveau == "region"
        ).first()
        if not zone:
            continue
        try:
            result = calc_score(zone.id, db)
            score_pct = round(result["score"].score * 100)
            niveau = result["score"].niveau_risque
            alerte = "⚠️  alerte créée" if result.get("alerte_creee") else ""
            print(f"  ✅ {nom:15} → {score_pct:3}%  [{niveau}]  {alerte}")
        except Exception as e:
            print(f"  ❌ {nom} : {e}")

    print("\n✅ Seed terminé — actualisez la page Scores de risque dans le frontend.")

finally:
    db.close()

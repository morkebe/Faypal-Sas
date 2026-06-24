"""
Seed des zones géographiques — Sénégal
Hiérarchie : Région → District sanitaire

Usage:
  python seed_zones.py
"""
import sys
from app.database import SessionLocal
from app.models.zone import Zone

# ── Régions avec metadata ML + GPS ────────────────────────────────────────────
REGIONS_DATA = [
    {"nom": "Dakar",        "region_ml": "DAKAR",        "lat": 14.693, "lon": -17.447},
    {"nom": "Thiès",        "region_ml": "THIÈS",        "lat": 14.788, "lon": -16.926},
    {"nom": "Saint-Louis",  "region_ml": "SAINT-LOUIS",  "lat": 16.018, "lon": -16.490},
    {"nom": "Louga",        "region_ml": "LOUGA",        "lat": 15.618, "lon": -16.224},
    {"nom": "Diourbel",     "region_ml": "DIOURBEL",     "lat": 14.655, "lon": -16.232},
    {"nom": "Fatick",       "region_ml": "FATICK",       "lat": 14.340, "lon": -16.407},
    {"nom": "Kaolack",      "region_ml": "KAOLACK",      "lat": 14.152, "lon": -16.073},
    {"nom": "Kaffrine",     "region_ml": "KAFFRINE",     "lat": 14.106, "lon": -15.551},
    {"nom": "Ziguinchor",   "region_ml": "ZIGUINCHOR",   "lat": 12.566, "lon": -16.273},
    {"nom": "Kolda",        "region_ml": "KOLDA",        "lat": 12.896, "lon": -14.941},
    {"nom": "Sédhiou",      "region_ml": "SÉDHIOU",      "lat": 12.708, "lon": -15.557},
    {"nom": "Tambacounda",  "region_ml": "TAMBACOUNDA",  "lat": 13.771, "lon": -13.667},
    {"nom": "Kédougou",     "region_ml": "KÉDOUGOU",     "lat": 12.556, "lon": -12.183},
    {"nom": "Matam",        "region_ml": "MATAM",        "lat": 15.656, "lon": -13.255},
]

# ── Districts par région ────────────────────────────────────────────────────────
DISTRICTS: dict[str, list[str]] = {
    "Dakar":        ["Dakar", "Guédiawaye", "Pikine", "Rufisque"],
    "Thiès":        ["Thiès", "Mbour", "Tivaouane"],
    "Saint-Louis":  ["Saint-Louis", "Dagana", "Podor"],
    "Louga":        ["Louga", "Linguère", "Kébémer"],
    "Diourbel":     ["Diourbel", "Mbacké", "Bambey"],
    "Fatick":       ["Fatick", "Foundiougne", "Gossas"],
    "Kaolack":      ["Kaolack", "Nioro du Rip", "Guinguinéo"],
    "Kaffrine":     ["Kaffrine", "Koungheul", "Birkelane", "Malem-Hodar"],
    "Ziguinchor":   ["Ziguinchor", "Bignona", "Oussouye"],
    "Kolda":        ["Kolda", "Vélingara", "Médina Yoro Foulah"],
    "Sédhiou":      ["Sédhiou", "Bounkiling", "Goudomp"],
    "Tambacounda":  ["Tambacounda", "Bakel", "Goudiry", "Koumpentoum"],
    "Kédougou":     ["Kédougou", "Saraya", "Salémata"],
    "Matam":        ["Matam", "Kanel", "Ranérou"],
}


def seed():
    db = SessionLocal()
    created = 0
    skipped = 0
    updated = 0
    try:
        for r in REGIONS_DATA:
            metadata = {
                "region_ml": r["region_ml"],
                "latitude":  r["lat"],
                "longitude": r["lon"],
            }

            region = db.query(Zone).filter(
                Zone.nom    == r["nom"],
                Zone.niveau == "region"
            ).first()

            if not region:
                region = Zone(
                    nom       = r["nom"],
                    niveau    = "region",
                    parent_id = None,
                    metadata_ = metadata,
                )
                db.add(region)
                db.flush()
                print(f"  [created] Région : {r['nom']} (region_ml={r['region_ml']})")
                created += 1
            else:
                # Mettre à jour le metadata si region_ml manquant
                if not (region.metadata_ or {}).get("region_ml"):
                    region.metadata_ = {**(region.metadata_ or {}), **metadata}
                    print(f"  [updated] Région : {r['nom']} → region_ml ajouté")
                    updated += 1
                else:
                    print(f"  [skip]    Région : {r['nom']}")
                    skipped += 1

            # ── Districts ─────────────────────────────────────────────────────
            for district_nom in DISTRICTS.get(r["nom"], []):
                existing = db.query(Zone).filter(
                    Zone.nom    == district_nom,
                    Zone.niveau == "district"
                ).first()
                if not existing:
                    db.add(Zone(nom=district_nom, niveau="district", parent_id=region.id))
                    print(f"    [created] District : {district_nom}")
                    created += 1
                else:
                    skipped += 1

        db.commit()
        print(f"\n✓ {created} créée(s), {updated} mise(s) à jour, {skipped} ignorée(s).")
    except Exception as e:
        db.rollback()
        print(f"\n✗ Erreur : {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()

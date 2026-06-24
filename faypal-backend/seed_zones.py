"""
Seed des zones géographiques — Sénégal
Hiérarchie : Région → District sanitaire

Usage:
  python seed_zones.py
"""
import sys
from app.database import SessionLocal
from app.models.zone import Zone

# ── Régions ────────────────────────────────────────────────────────────────────
REGIONS = [
    "Dakar", "Thiès", "Saint-Louis", "Louga", "Diourbel",
    "Fatick", "Kaolack", "Kaffrine", "Ziguinchor", "Kolda",
    "Sédhiou", "Tambacounda", "Kédougou", "Matam",
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
    try:
        for region_nom in REGIONS:
            # ── Région ────────────────────────────────────────────────────────
            region = db.query(Zone).filter(Zone.nom == region_nom, Zone.niveau == "region").first()
            if not region:
                region = Zone(nom=region_nom, niveau="region", parent_id=None)
                db.add(region)
                db.flush()  # génère l'UUID
                print(f"  [created] Région : {region_nom}")
                created += 1
            else:
                print(f"  [skip]    Région : {region_nom}")
                skipped += 1

            # ── Districts ─────────────────────────────────────────────────────
            for district_nom in DISTRICTS.get(region_nom, []):
                existing = db.query(Zone).filter(Zone.nom == district_nom, Zone.niveau == "district").first()
                if not existing:
                    db.add(Zone(nom=district_nom, niveau="district", parent_id=region.id))
                    print(f"    [created] District : {district_nom}")
                    created += 1
                else:
                    skipped += 1

        db.commit()
        print(f"\n✓ {created} zone(s) créée(s), {skipped} ignorée(s).")
    except Exception as e:
        db.rollback()
        print(f"\n✗ Erreur : {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()

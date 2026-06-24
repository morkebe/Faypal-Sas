# ══════════════════════════════════════════════════════════════
# FAYPAL — API FastAPI v2
# Prédiction paludisme + Enrichissement dataset MoustiBox
# Modèle de production : XGBoost
# ══════════════════════════════════════════════════════════════

import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import xgboost as xgb

# ── Chemins ───────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / 'models'
DATA_DIR   = BASE_DIR / 'data'
DATASET_PATH = DATA_DIR / 'faypal_dataset_final.csv'

# ── Chargement des modèles v2 ─────────────────────────────────
print("Chargement des modeles FayPal v2...")

xgb_h1  = xgb.XGBRegressor(); xgb_h1.load_model(str(MODELS_DIR  / 'xgb_h1.json'))
xgb_h4  = xgb.XGBRegressor(); xgb_h4.load_model(str(MODELS_DIR  / 'xgb_h4.json'))
xgb_h12 = xgb.XGBRegressor(); xgb_h12.load_model(str(MODELS_DIR / 'xgb_h12.json'))
le_region_v2 = joblib.load(MODELS_DIR / 'le_region_v2.pkl')
le_saison_v2 = joblib.load(MODELS_DIR / 'le_saison_v2.pkl')
MODELS_V2_LOADED = True

# Aliases pour compatibilité avec les fonctions héritées
xgb_model = xgb_h1
le_region  = le_region_v2
le_saison  = le_saison_v2

df = pd.read_csv(DATASET_PATH)

print("Modeles v2 charges (H1, H4, H12)")
print(f"Dataset : {len(df)} lignes x {df.shape[1]} colonnes")

# ── Constantes ────────────────────────────────────────────────
REGIONS = sorted(df['region'].unique().tolist())

STRATES = {
    'KÉDOUGOU':    'haute',
    'KOLDA':       'haute',
    'TAMBACOUNDA': 'haute',
    'SÉDHIOU':     'haute',
    'ZIGUINCHOR':  'haute',
    'KAOLACK':     'moderee',
    'KAFFRINE':    'moderee',
    'FATICK':      'moderee',
    'DIOURBEL':    'moderee',
    'MATAM':       'moderee',
    'DAKAR':       'faible',
    'THIÈS':       'faible',
    'LOUGA':       'faible',
    'SAINT-LOUIS': 'faible',
}

# Stockage en mémoire des rapports MoustiBox
rapports_moustibox = []

# ── Modèles de données ────────────────────────────────────────
class PredictionRequest(BaseModel):
    region:  str
    semaine: int
    annee:   Optional[int] = 2025

class MoustiboxRapport(BaseModel):
    region:             str
    district:           str
    timestamp:          str
    duree_minutes:      float
    total_captures:     int
    total_detections:   int
    compteurs:          dict
    anopheles_detectes: int
    alerte_paludisme:   bool
    taux_detection:     float
    modele:             Optional[str] = 'YOLOv8n'

# ── Application ───────────────────────────────────────────────
app = FastAPI(
    title="FayPal API",
    description="API de prediction du paludisme au Senegal — "
                "Données NASA POWER + MODIS + PNLP + MoustiBox",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ───────────────────────────────────────────────────
def get_features_region(region: str, semaine: int) -> dict:
    """
    Récupère les valeurs climatiques et végétation
    pour une région et semaine depuis le dataset historique.
    Prédicteurs principaux : NASA POWER + MODIS (90% du signal)
    """
    mask = (df['region'] == region) & (df['semaine'] == semaine)
    data = df[mask]
    if len(data) == 0:
        data = df[df['region'] == region]
    return data.median(numeric_only=True).to_dict()


def calculer_indice_vectoriel_moustibox(
        anopheles: int,
        duree_min: float,
        vals: dict) -> float:
    """
    Calcule l'indice vectoriel enrichi par les données MoustiBox.

    Sans MoustiBox (proxy calculé) :
        indice = 0.40×pluie_lag4 + 0.30×ndvi + 0.20×humidite + 0.10×temp

    Avec MoustiBox (mesure réelle terrain) :
        indice = 0.60×densite_anopheles_normalisee
               + 0.25×pluie_lag4_norm
               + 0.15×ndvi_norm

    Le MoustiBox améliore la précision mais ne remplace pas
    les prédicteurs climatiques principaux.
    """
    # Densité Anopheles par heure de capture (normalisée 0-1)
    densite_horaire   = anopheles / max(duree_min / 60, 0.5)
    densite_norm      = min(1.0, densite_horaire / 20.0)

    # Composantes climatiques normalisées (NASA POWER)
    pluie_lag4        = vals.get('pluie_lag4', 0.0)
    pluie_norm        = min(1.0, pluie_lag4 / 100.0)

    ndvi              = vals.get('ndvi', 0.3)
    ndvi_norm         = max(0.0, min(1.0, ndvi))

    # Indice hybride : mesure terrain + signal climatique
    indice = (0.60 * densite_norm +
              0.25 * pluie_norm  +
              0.15 * ndvi_norm)

    return round(float(indice), 4)


def enrichir_dataset(rapport: MoustiboxRapport):
    """
    Enrichit le dataset FayPal avec les données MoustiBox.

    Le MoustiBox fournit la vraie densité d'Anopheles,
    remplaçant le proxy indice_vectoriel calculé depuis
    les variables climatiques.

    Les prédicteurs principaux (NASA POWER + MODIS) restent
    inchangés — le MoustiBox améliore seulement l'indice vectoriel.
    """
    global df

    # Déterminer la semaine ISO depuis le timestamp
    try:
        ts      = datetime.fromisoformat(rapport.timestamp)
        semaine = ts.isocalendar()[1]
        annee   = ts.year
    except Exception:
        now     = datetime.now()
        semaine = now.isocalendar()[1]
        annee   = now.year

    # Récupérer les valeurs climatiques de référence
    # (NASA POWER + MODIS — prédicteurs principaux)
    vals = get_features_region(rapport.region, semaine)

    # Calculer l'indice vectoriel enrichi par MoustiBox
    indice_vectoriel_reel = calculer_indice_vectoriel_moustibox(
        anopheles  = rapport.anopheles_detectes,
        duree_min  = rapport.duree_minutes,
        vals       = vals
    )

    # Mettre à jour l'indice vectoriel dans le dataset
    # pour les lignes correspondant à cette région/semaine
    mask = ((df['region'] == rapport.region) &
            (df['semaine'] == semaine))

    if mask.any():
        ancien_indice = df.loc[mask, 'indice_vectoriel'].mean()
        # Moyenne pondérée : 70% nouvelle mesure + 30% historique
        nouvel_indice = (0.70 * indice_vectoriel_reel +
                         0.30 * ancien_indice)
        df.loc[mask, 'indice_vectoriel'] = round(nouvel_indice, 4)

        print(f"[MoustiBox] {rapport.region} semaine {semaine} : "
              f"indice_vectoriel {ancien_indice:.4f} -> "
              f"{nouvel_indice:.4f} "
              f"({rapport.anopheles_detectes} Anopheles)")

        # Sauvegarder le dataset enrichi
        df.to_csv(DATASET_PATH, index=False)
        print(f"[MoustiBox] Dataset enrichi sauvegarde")
        return {
            'enrichi':            True,
            'semaine':            semaine,
            'indice_precedent':   round(float(ancien_indice), 4),
            'indice_enrichi':     round(nouvel_indice, 4),
            'anopheles_utilises': rapport.anopheles_detectes,
        }
    else:
        print(f"[MoustiBox] Pas de donnees pour "
              f"{rapport.region} semaine {semaine}")
        return {'enrichi': False, 'raison': 'Pas de donnees historiques'}


def construire_features(region: str, semaine: int) -> np.ndarray:
    """
    Construit le vecteur de features pour XGBoost.

    Prédicteurs principaux (NASA POWER + MODIS) :
    - Temperature, pluie, humidite, vent, evapotranspiration
    - NDVI, LST, humidite sol
    - Variables lag (pluie_lag2/4, ndvi_lag2/4/8)

    Enrichissement MoustiBox :
    - indice_vectoriel mis à jour si données terrain disponibles
    """
    vals = get_features_region(region, semaine)

    # Saison depuis le dataset (pas calculée manuellement)
    mask   = (df['region'] == region) & (df['semaine'] == semaine)
    if mask.any():
        saison = df[mask]['saison'].mode()[0]
    else:
        saison = df[df['region'] == region]['saison'].mode()[0]

    try:
        saison_enc = le_saison.transform([saison])[0]
    except ValueError:
        saison_enc = 0

    features = {
        # Identifiants
        'region_enc':            le_region.transform([region])[0],
        'semaine':               semaine,
        # Température (NASA POWER — prédicteur principal)
        'temp_moy_c':            vals.get('temp_moy_c', 28.0),
        'temp_max_c':            vals.get('temp_max_c', 33.0),
        'temp_min_c':            vals.get('temp_min_c', 22.0),
        'temp_surface_c':        vals.get('temp_surface_c', 30.0),
        # Pluie et lags (NASA POWER — prédicteur principal)
        'pluie_mm':              vals.get('pluie_mm', 0.0),
        'pluie_lag2':            vals.get('pluie_lag2', 0.0),
        'pluie_lag4':            vals.get('pluie_lag4', 0.0),
        # Atmosphère (NASA POWER)
        'humidite_pct':          vals.get('humidite_pct', 55.0),
        'vent_moy_ms':           vals.get('vent_moy_ms', 3.0),
        'evapotranspiration_mm': vals.get('evapotranspiration_mm', 4.0),
        # Sol (NASA POWER)
        'humidite_sol_racine':   vals.get('humidite_sol_racine', 0.3),
        'humidite_sol_surface':  vals.get('humidite_sol_surface', 0.2),
        # Végétation (MODIS GEE — prédicteur principal)
        'ndvi':                  vals.get('ndvi', 0.3),
        'ndvi_lag2':             vals.get('ndvi_lag2', 0.3),
        'ndvi_lag4':             vals.get('ndvi_lag4', 0.3),
        'ndvi_lag8':             vals.get('ndvi_lag8', 0.3),
        'lst_jour_c':            vals.get('lst_jour_c', 35.0),
        # Saisonnalité
        'semaine_sin':           np.sin(2 * np.pi * semaine / 52),
        'semaine_cos':           np.cos(2 * np.pi * semaine / 52),
        # Contexte
        'population':            vals.get('population', 500000),
        'saison_enc':            saison_enc,
        # Indice vectoriel (proxy ou enrichi par MoustiBox)
        'indice_vectoriel':      vals.get('indice_vectoriel', 0.3),
    }

    FEATURES_ORDER = [
        'region_enc', 'semaine',
        'temp_moy_c', 'temp_max_c', 'temp_min_c', 'temp_surface_c',
        'pluie_mm', 'pluie_lag2', 'pluie_lag4',
        'humidite_pct', 'vent_moy_ms', 'evapotranspiration_mm',
        'humidite_sol_racine', 'humidite_sol_surface',
        'ndvi', 'ndvi_lag2', 'ndvi_lag4', 'ndvi_lag8', 'lst_jour_c',
        'semaine_sin', 'semaine_cos',
        'population', 'saison_enc', 'indice_vectoriel'
    ]

    return np.array([[features[f] for f in FEATURES_ORDER]])


def niveau_risque(cas: int, region: str) -> str:
    strate = STRATES.get(region.upper(), 'moderee')
    if strate == 'haute':
        if cas > 5000: return 'CRITIQUE'
        if cas > 2000: return 'ELEVE'
        if cas > 500:  return 'MODERE'
        return 'FAIBLE'
    elif strate == 'moderee':
        if cas > 1000: return 'CRITIQUE'
        if cas > 500:  return 'ELEVE'
        if cas > 100:  return 'MODERE'
        return 'FAIBLE'
    else:
        if cas > 200:  return 'ELEVE'
        if cas > 50:   return 'MODERE'
        return 'FAIBLE'


# ══════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "projet":      "FayPal",
        "version":     "2.0.0",
        "status":      "actif",
        "description": "Prediction paludisme Senegal — "
                       "NASA POWER + MODIS + PNLP + MoustiBox",
        "predicteurs_principaux": [
            "NASA POWER (pluie, temp, humidite)",
            "MODIS GEE (NDVI, LST)",
            "Historique PNLP (cas confirmes)"
        ],
        "enrichissement_moustibox": [
            "Densite Anopheles reelle (remplace proxy indice_vectoriel)"
        ],
        "endpoints": [
            "GET  /health",
            "GET  /regions",
            "POST /predict",
            "POST /predict/v2",
            "POST /predict/multi-horizon",
            "GET  /historique/{region}",
            "GET  /dashboard/{region}",
            "POST /moustibox/rapport",
            "GET  /moustibox/rapports",
            "GET  /alertes",
            "GET  /stats",
        ],
        "v2_modeles_charges": MODELS_V2_LOADED,
    }


@app.get("/health")
def health():
    return {
        "status":    "ok",
        "timestamp": datetime.now().isoformat(),
        "modele":    "XGBoost",
        "regions":   len(REGIONS),
        "dataset":   f"{len(df)} observations",
    }


@app.get("/regions")
def get_regions():
    return {
        "regions": [
            {"nom": r, "strate": STRATES.get(r.upper(), 'moderee')}
            for r in REGIONS
        ],
        "total": len(REGIONS)
    }


@app.post("/predict")
def predict(req: PredictionRequest):
    """
    Prédit les cas de paludisme pour une région et semaine.

    Utilise principalement :
    - Données climatiques NASA POWER (pluie, temp, humidite...)
    - Données végétation MODIS (NDVI, LST)
    - Profil saisonnier historique PNLP

    L'indice vectoriel est enrichi automatiquement si des données
    MoustiBox sont disponibles pour cette région.
    """
    region = req.region.upper().strip()
    if region not in [r.upper() for r in REGIONS]:
        raise HTTPException(
            status_code=400,
            detail=f"Region inconnue : {req.region}. "
                   f"Disponibles : {REGIONS}"
        )
    if not (1 <= req.semaine <= 52):
        raise HTTPException(
            status_code=400,
            detail="Semaine doit etre entre 1 et 52"
        )

    region_exact = next(r for r in REGIONS if r.upper() == region)

    if not MODELS_V2_LOADED:
        raise HTTPException(
            status_code=503,
            detail="Modèles v2 non chargés. Lancer : python notebooks/models_faypal_v2.py"
        )

    try:
        X        = construire_features_v2(region_exact, req.semaine, {}, req.annee or 2025)
        pred_log = xgb_h1.predict(X)[0]
        cas_pred = max(0, int(np.expm1(pred_log)))
        cas_min  = max(0, int(cas_pred * 0.80))
        cas_max  = int(cas_pred * 1.20)

        mask = (df['region'] == region_exact) & (df['semaine'] == req.semaine)

        return {
            "region":        region_exact,
            "semaine":       req.semaine,
            "annee":         req.annee,
            "saison":        df[mask]['saison'].mode()[0] if mask.any() else 'inconnue',
            "cas_predits":   cas_pred,
            "intervalle":    {"min": cas_min, "max": cas_max},
            "niveau_risque": niveau_risque(cas_pred, region_exact),
            "strate":        STRATES.get(region, 'moderee'),
            "modele":        "XGBoost v2 (43 features)",
            "timestamp":     datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"Erreur de prediction : {str(e)}")


@app.get("/historique/{region}")
def get_historique(region: str, annee: Optional[int] = None):
    """Historique des cas confirmés pour une région."""
    region = region.upper().strip()
    mask   = df['region'].str.upper() == region

    if not mask.any():
        raise HTTPException(status_code=404,
                            detail=f"Region introuvable : {region}")
    if annee:
        mask &= df['annee'] == annee

    data = df[mask][['annee', 'semaine', 'cas_confirmes',
                      'ndvi', 'pluie_mm', 'indice_vectoriel']]
    data = data.sort_values(['annee', 'semaine'])

    return {
        "region":       region,
        "annee":        annee,
        "total_lignes": len(data),
        "donnees":      data.to_dict(orient='records')
    }


@app.get("/dashboard/{region}")
def get_dashboard(region: str):
    """
    Résumé complet pour le dashboard React.
    Retourne : historique + prédictions 4 semaines + alertes MoustiBox.
    """
    region = region.upper().strip()
    mask   = df['region'].str.upper() == region

    if not mask.any():
        raise HTTPException(status_code=404,
                            detail=f"Region introuvable : {region}")

    region_exact = df[mask]['region'].iloc[0]
    semaine_actuelle = datetime.now().isocalendar()[1]

    # Prédictions 4 semaines à venir
    annee_courante = datetime.now().year
    predictions = []
    model_pred = xgb_h1 if MODELS_V2_LOADED else None
    for s in range(semaine_actuelle, min(semaine_actuelle + 4, 53)):
        try:
            if model_pred is not None:
                X        = construire_features_v2(region_exact, s, {}, annee_courante)
                pred_log = model_pred.predict(X)[0]
            else:
                X        = construire_features(region_exact, s)
                pred_log = xgb_model.predict(X)[0]
            cas_pred = max(0, int(np.expm1(pred_log)))
            predictions.append({
                "semaine":       s,
                "cas_predits":   cas_pred,
                "niveau_risque": niveau_risque(cas_pred, region_exact),
            })
        except Exception:
            pass

    # Historique récent (dernières 12 semaines)
    hist = df[mask].sort_values(
        ['annee', 'semaine']).tail(12)[
        ['annee', 'semaine', 'cas_confirmes',
         'indvi' if 'indvi' in df.columns else 'ndvi',
         'pluie_mm']
    ]

    # Rapports MoustiBox pour cette région
    rapports_region = [
        r for r in rapports_moustibox
        if r.get('region', '').upper() == region
    ][-5:]

    return {
        "region":            region_exact,
        "strate":            STRATES.get(region, 'moderee'),
        "semaine_actuelle":  semaine_actuelle,
        "predictions_4sem":  predictions,
        "historique_12sem":  df[mask].tail(12)[
            ['annee', 'semaine', 'cas_confirmes', 'ndvi', 'pluie_mm']
        ].to_dict(orient='records'),
        "derniers_rapports_moustibox": rapports_region,
        "alerte_active":     any(
            r.get('alerte_paludisme', False)
            for r in rapports_region
        ),
    }


@app.post("/moustibox/rapport")
def recevoir_rapport_moustibox(rapport: MoustiboxRapport):
    """
    Reçoit un rapport du dispositif MoustiBox.

    Flux complet :
    1. Reçoit le comptage Anopheles du Pi Zero 2W
    2. Met à jour l'indice_vectoriel dans le dataset
       (enrichit le prédicteur, sans remplacer NASA POWER/MODIS)
    3. Génère une alerte si >= 10 Anopheles
    4. Le prochain appel /predict utilisera l'indice enrichi
    """
    rapport_dict = rapport.model_dump()
    rapport_dict['recu_le'] = datetime.now().isoformat()
    rapports_moustibox.append(rapport_dict)

    # Garder 500 derniers rapports
    if len(rapports_moustibox) > 500:
        rapports_moustibox.pop(0)

    # Enrichir le dataset avec les données MoustiBox
    enrichissement = enrichir_dataset(rapport)

    alerte = rapport.alerte_paludisme
    if alerte:
        print(f"[ALERTE] {rapport.region} : "
              f"{rapport.anopheles_detectes} Anopheles !")

    return {
        "status":          "recu",
        "alerte":          alerte,
        "enrichissement":  enrichissement,
        "message": (
            f"ALERTE : {rapport.anopheles_detectes} Anopheles "
            f"detectes dans {rapport.district}"
            if alerte else
            f"Rapport enregistre — indice_vectoriel mis a jour"
        ),
        "impact_prediction": (
            "L'indice vectoriel a ete enrichi avec les donnees "
            "terrain. Le prochain appel /predict utilisera cette "
            "mesure reelle a la place du proxy calcule."
            if enrichissement.get('enrichi') else
            "Pas d'enrichissement possible pour cette periode."
        ),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/moustibox/rapports")
def get_rapports_moustibox(
        region: Optional[str] = None,
        limite: int = 50):
    data = rapports_moustibox.copy()
    if region:
        data = [r for r in data
                if r.get('region', '').upper() == region.upper()]
    return {"total": len(data), "rapports": data[-limite:]}


@app.get("/alertes")
def get_alertes():
    alertes = [r for r in rapports_moustibox
               if r.get('alerte_paludisme', False)]
    return {"total_alertes": len(alertes), "alertes": alertes[-20:]}


@app.get("/stats")
def get_stats():
    return {
        "total_observations":      len(df),
        "regions":                 len(REGIONS),
        "periode":                 f"{int(df['annee'].min())}-{int(df['annee'].max())}",
        "cas_total_historique":    int(df['cas_confirmes'].sum()),
        "region_plus_endemique":   str(
            df.groupby('region')['cas_confirmes'].mean().idxmax()),
        "predicteurs_principaux":  "NASA POWER + MODIS GEE (90% du signal)",
        "enrichissement_moustibox":"indice_vectoriel (10% additionnel)",
        "modele_production":       "XGBoost v2 multi-horizon (H1/H4/H12 — 43 features)",
        "rapports_moustibox_recus":len(rapports_moustibox),
        "v2_modeles_charges":      MODELS_V2_LOADED,
    }


# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS V2 — MULTI-HORIZON + ATTRIBUTS ENRICHIS
# ══════════════════════════════════════════════════════════════════════

# Profils régionaux (mêmes valeurs que notebooks/models_faypal_v2.py)
REGION_PROFILE_V2 = {
    'DAKAR':       dict(densite_km2=6020, milda_base=68.2, taux_pauvrete= 7.2, nb_cs_10k=2.8, altitude_m= 22, zone_hydro=0, dist_eau_km= 0.5, pct_moins5=12.0, pct_graves=1.2, cps_zone=False, aid_zone=False),
    'DIOURBEL':    dict(densite_km2= 212, milda_base=52.3, taux_pauvrete=38.1, nb_cs_10k=1.4, altitude_m= 45, zone_hydro=1, dist_eau_km=12.0, pct_moins5=13.5, pct_graves=2.8, cps_zone=True,  aid_zone=False),
    'FATICK':      dict(densite_km2=  72, milda_base=58.7, taux_pauvrete=42.3, nb_cs_10k=1.2, altitude_m= 15, zone_hydro=2, dist_eau_km= 4.2, pct_moins5=14.0, pct_graves=2.0, cps_zone=True,  aid_zone=False),
    'KAFFRINE':    dict(densite_km2=  45, milda_base=55.1, taux_pauvrete=56.2, nb_cs_10k=0.9, altitude_m= 35, zone_hydro=2, dist_eau_km= 8.5, pct_moins5=15.5, pct_graves=2.5, cps_zone=True,  aid_zone=False),
    'KAOLACK':     dict(densite_km2=  98, milda_base=60.3, taux_pauvrete=42.8, nb_cs_10k=1.5, altitude_m= 10, zone_hydro=2, dist_eau_km= 3.0, pct_moins5=14.5, pct_graves=2.4, cps_zone=True,  aid_zone=False),
    'KOLDA':       dict(densite_km2=  24, milda_base=62.8, taux_pauvrete=66.8, nb_cs_10k=0.8, altitude_m= 55, zone_hydro=3, dist_eau_km= 2.5, pct_moins5=20.5, pct_graves=3.1, cps_zone=True,  aid_zone=True),
    'KÉDOUGOU':    dict(densite_km2=   8, milda_base=71.5, taux_pauvrete=72.1, nb_cs_10k=0.7, altitude_m=310, zone_hydro=3, dist_eau_km= 1.8, pct_moins5=22.0, pct_graves=3.8, cps_zone=True,  aid_zone=True),
    'LOUGA':       dict(densite_km2=  28, milda_base=45.2, taux_pauvrete=42.5, nb_cs_10k=1.0, altitude_m= 38, zone_hydro=1, dist_eau_km=18.0, pct_moins5=11.5, pct_graves=1.5, cps_zone=False, aid_zone=False),
    'MATAM':       dict(densite_km2=  18, milda_base=52.6, taux_pauvrete=58.7, nb_cs_10k=0.8, altitude_m= 28, zone_hydro=1, dist_eau_km= 5.0, pct_moins5=14.0, pct_graves=2.2, cps_zone=True,  aid_zone=False),
    'SAINT-LOUIS': dict(densite_km2=  32, milda_base=48.5, taux_pauvrete=40.2, nb_cs_10k=1.3, altitude_m=  8, zone_hydro=1, dist_eau_km= 2.0, pct_moins5=11.0, pct_graves=1.3, cps_zone=False, aid_zone=False),
    'SÉDHIOU':     dict(densite_km2=  38, milda_base=65.4, taux_pauvrete=68.3, nb_cs_10k=0.7, altitude_m= 30, zone_hydro=3, dist_eau_km= 1.5, pct_moins5=17.5, pct_graves=3.0, cps_zone=True,  aid_zone=True),
    'TAMBACOUNDA': dict(densite_km2=  12, milda_base=63.2, taux_pauvrete=61.4, nb_cs_10k=0.8, altitude_m= 65, zone_hydro=2, dist_eau_km= 4.8, pct_moins5=18.5, pct_graves=3.0, cps_zone=True,  aid_zone=True),
    'THIÈS':       dict(densite_km2= 182, milda_base=54.8, taux_pauvrete=32.6, nb_cs_10k=1.6, altitude_m= 68, zone_hydro=2, dist_eau_km= 8.5, pct_moins5=12.5, pct_graves=1.8, cps_zone=True,  aid_zone=False),
    'ZIGUINCHOR':  dict(densite_km2=  62, milda_base=67.8, taux_pauvrete=62.5, nb_cs_10k=1.1, altitude_m= 18, zone_hydro=3, dist_eau_km= 1.0, pct_moins5=16.5, pct_graves=3.2, cps_zone=True,  aid_zone=True),
}

# Données nationales annuelles vérifiées — Bulletins PNLP PDF 2015-2024
# incidence_nat recalculée depuis cas_confirmés/population×1000 (corrigée)
ANNEE_DATA_API = {
    2017: dict(deces_nat=284, incidence_nat=26.10, tpi3_nat=46.29),
    2018: dict(deces_nat=555, incidence_nat=33.90, tpi3_nat=46.10),
    2019: dict(deces_nat=260, incidence_nat=21.90, tpi3_nat=53.60),
    2020: dict(deces_nat=373, incidence_nat=26.70, tpi3_nat=62.90),
    2021: dict(deces_nat=399, incidence_nat=31.20, tpi3_nat=64.80),
    2022: dict(deces_nat=273, incidence_nat=20.20, tpi3_nat=68.00),
    2023: dict(deces_nat=199, incidence_nat=None,  tpi3_nat=71.79),
    2024: dict(deces_nat=314, incidence_nat=22.80, tpi3_nat=68.50),
    2025: dict(deces_nat=314, incidence_nat=22.80, tpi3_nat=68.50),  # estimation 2024
    2026: dict(deces_nat=314, incidence_nat=22.80, tpi3_nat=68.50),  # estimation 2024
}

# Données réelles PNLP par région — Bulletins épidémiologiques 2018-2022
# Valeurs vérifiées : totaux nationaux = somme des régions (validé)
# tpi3 : couverture TPI3 femmes enceintes par région (%)
# 2022 : complétude 73.8% (grève) — valeurs moins fiables
PNLP_REGIONAL_API = {
    2018: {
        'DAKAR':       dict(cas=15124,  cas_moins5=1031,  cas_graves=2642, tpi3=47.0),
        'DIOURBEL':    dict(cas=21125,  cas_moins5=1876,  cas_graves=1209, tpi3=47.3),
        'FATICK':      dict(cas=2528,   cas_moins5=361,   cas_graves=69,   tpi3=52.0),
        'KAFFRINE':    dict(cas=8730,   cas_moins5=1084,  cas_graves=261,  tpi3=51.1),
        'KAOLACK':     dict(cas=10809,  cas_moins5=763,   cas_graves=640,  tpi3=51.3),
        'KÉDOUGOU':    dict(cas=87609,  cas_moins5=18255, cas_graves=1426, tpi3=38.8),
        'KOLDA':       dict(cas=190217, cas_moins5=37338, cas_graves=2667, tpi3=33.7),
        'LOUGA':       dict(cas=2753,   cas_moins5=169,   cas_graves=193,  tpi3=47.1),
        'MATAM':       dict(cas=11688,  cas_moins5=1118,  cas_graves=308,  tpi3=38.7),
        'SAINT-LOUIS': dict(cas=1082,   cas_moins5=23,    cas_graves=174,  tpi3=47.4),
        'SÉDHIOU':     dict(cas=12386,  cas_moins5=1393,  cas_graves=263,  tpi3=36.7),
        'TAMBACOUNDA': dict(cas=158977, cas_moins5=26158, cas_graves=2864, tpi3=45.8),
        'THIÈS':       dict(cas=4490,   cas_moins5=293,   cas_graves=398,  tpi3=45.0),
        'ZIGUINCHOR':  dict(cas=3426,   cas_moins5=236,   cas_graves=236,  tpi3=50.9),
    },
    2019: {
        'DAKAR':       dict(cas=18558,  cas_moins5=1031,  cas_graves=2087, tpi3=53.5),
        'DIOURBEL':    dict(cas=15641,  cas_moins5=1036,  cas_graves=1007, tpi3=55.0),
        'FATICK':      dict(cas=981,    cas_moins5=57,    cas_graves=35,   tpi3=62.4),
        'KAFFRINE':    dict(cas=5702,   cas_moins5=559,   cas_graves=188,  tpi3=61.3),
        'KAOLACK':     dict(cas=4518,   cas_moins5=360,   cas_graves=181,  tpi3=58.7),
        'KÉDOUGOU':    dict(cas=67941,  cas_moins5=8532,  cas_graves=1095, tpi3=48.2),
        'KOLDA':       dict(cas=116983, cas_moins5=14402, cas_graves=1638, tpi3=42.1),
        'LOUGA':       dict(cas=1758,   cas_moins5=98,    cas_graves=237,  tpi3=51.9),
        'MATAM':       dict(cas=5580,   cas_moins5=407,   cas_graves=182,  tpi3=45.3),
        'SAINT-LOUIS': dict(cas=1082,   cas_moins5=23,    cas_graves=154,  tpi3=51.5),
        'SÉDHIOU':     dict(cas=5678,   cas_moins5=518,   cas_graves=206,  tpi3=50.4),
        'TAMBACOUNDA': dict(cas=101077, cas_moins5=10462, cas_graves=1549, tpi3=49.6),
        'THIÈS':       dict(cas=5722,   cas_moins5=263,   cas_graves=480,  tpi3=53.8),
        'ZIGUINCHOR':  dict(cas=3757,   cas_moins5=174,   cas_graves=313,  tpi3=60.0),
    },
    2020: {
        'DAKAR':       dict(cas=15089,  cas_moins5=693,   cas_graves=2284, tpi3=59.7),
        'DIOURBEL':    dict(cas=17139,  cas_moins5=1165,  cas_graves=573,  tpi3=61.0),
        'FATICK':      dict(cas=942,    cas_moins5=53,    cas_graves=38,   tpi3=77.5),
        'KAFFRINE':    dict(cas=5608,   cas_moins5=606,   cas_graves=173,  tpi3=77.4),
        'KAOLACK':     dict(cas=5030,   cas_moins5=285,   cas_graves=197,  tpi3=71.6),
        'KÉDOUGOU':    dict(cas=86449,  cas_moins5=12436, cas_graves=1293, tpi3=47.9),
        'KOLDA':       dict(cas=155967, cas_moins5=16426, cas_graves=1336, tpi3=52.8),
        'LOUGA':       dict(cas=2301,   cas_moins5=128,   cas_graves=314,  tpi3=67.1),
        'MATAM':       dict(cas=6683,   cas_moins5=616,   cas_graves=185,  tpi3=53.8),
        'SAINT-LOUIS': dict(cas=919,    cas_moins5=41,    cas_graves=152,  tpi3=60.9),
        'SÉDHIOU':     dict(cas=10802,  cas_moins5=928,   cas_graves=334,  tpi3=62.0),
        'TAMBACOUNDA': dict(cas=128541, cas_moins5=13273, cas_graves=1668, tpi3=58.8),
        'THIÈS':       dict(cas=5447,   cas_moins5=190,   cas_graves=372,  tpi3=62.3),
        'ZIGUINCHOR':  dict(cas=4396,   cas_moins5=195,   cas_graves=260,  tpi3=67.5),
    },
    2021: {
        'DAKAR':       dict(cas=19343,  cas_moins5=930,   cas_graves=2801, tpi3=63.1),
        'DIOURBEL':    dict(cas=37190,  cas_moins5=2071,  cas_graves=2330, tpi3=60.6),
        'FATICK':      dict(cas=1388,   cas_moins5=60,    cas_graves=52,   tpi3=76.1),
        'KAFFRINE':    dict(cas=4278,   cas_moins5=354,   cas_graves=155,  tpi3=75.8),
        'KAOLACK':     dict(cas=13409,  cas_moins5=619,   cas_graves=241,  tpi3=74.2),
        'KÉDOUGOU':    dict(cas=105694, cas_moins5=14865, cas_graves=1440, tpi3=60.2),
        'KOLDA':       dict(cas=181999, cas_moins5=20615, cas_graves=2242, tpi3=59.5),
        'LOUGA':       dict(cas=2080,   cas_moins5=62,    cas_graves=258,  tpi3=67.1),
        'MATAM':       dict(cas=5473,   cas_moins5=400,   cas_graves=160,  tpi3=56.7),
        'SAINT-LOUIS': dict(cas=1001,   cas_moins5=38,    cas_graves=101,  tpi3=63.4),
        'SÉDHIOU':     dict(cas=17668,  cas_moins5=1775,  cas_graves=436,  tpi3=60.2),
        'TAMBACOUNDA': dict(cas=133778, cas_moins5=14401, cas_graves=1852, tpi3=64.2),
        'THIÈS':       dict(cas=6295,   cas_moins5=189,   cas_graves=352,  tpi3=62.2),
        'ZIGUINCHOR':  dict(cas=7254,   cas_moins5=386,   cas_graves=422,  tpi3=69.2),
    },
    2022: {
        'DAKAR':       dict(cas=27845,  cas_moins5=1239,  cas_graves=115,  tpi3=67.3),
        'DIOURBEL':    dict(cas=48590,  cas_moins5=3153,  cas_graves=480,  tpi3=69.0),
        'FATICK':      dict(cas=1450,   cas_moins5=68,    cas_graves=18,   tpi3=79.7),
        'KAFFRINE':    dict(cas=2396,   cas_moins5=199,   cas_graves=31,   tpi3=78.7),
        'KAOLACK':     dict(cas=30111,  cas_moins5=1813,  cas_graves=503,  tpi3=68.2),
        'KÉDOUGOU':    dict(cas=89093,  cas_moins5=14017, cas_graves=2186, tpi3=66.5),
        'KOLDA':       dict(cas=80587,  cas_moins5=10305, cas_graves=1449, tpi3=63.9),
        'LOUGA':       dict(cas=1522,   cas_moins5=67,    cas_graves=19,   tpi3=70.7),
        'MATAM':       dict(cas=5473,   cas_moins5=400,   cas_graves=160,  tpi3=52.3),
        'SAINT-LOUIS': dict(cas=679,    cas_moins5=30,    cas_graves=12,   tpi3=67.3),
        'SÉDHIOU':     dict(cas=3361,   cas_moins5=368,   cas_graves=44,   tpi3=65.8),
        'TAMBACOUNDA': dict(cas=63696,  cas_moins5=6314,  cas_graves=1063, tpi3=68.8),
        'THIÈS':       dict(cas=5840,   cas_moins5=212,   cas_graves=38,   tpi3=60.8),
        'ZIGUINCHOR':  dict(cas=2796,   cas_moins5=158,   cas_graves=40,   tpi3=69.3),
    },
    # 2023 : complétude 26.66% → pas de données régionales disponibles (grève)
    # 2024 : complétude 82.1% — données réelles du bulletin PNLP 2024
    2024: {
        'DAKAR':       dict(cas=28722,  cas_moins5=1525,  cas_graves=3161, tpi3=62.1),
        'DIOURBEL':    dict(cas=91502,  cas_moins5=5730,  cas_graves=3948, tpi3=58.2),
        'FATICK':      dict(cas=3390,   cas_moins5=147,   cas_graves=89,   tpi3=87.8),
        'KAFFRINE':    dict(cas=5159,   cas_moins5=389,   cas_graves=124,  tpi3=72.3),
        'KAOLACK':     dict(cas=56450,  cas_moins5=2523,  cas_graves=443,  tpi3=73.2),
        'KÉDOUGOU':    dict(cas=69560,  cas_moins5=8149,  cas_graves=309,  tpi3=71.1),
        'KOLDA':       dict(cas=62054,  cas_moins5=5739,  cas_graves=658,  tpi3=78.3),
        'LOUGA':       dict(cas=3857,   cas_moins5=179,   cas_graves=99,   tpi3=71.1),
        'MATAM':       dict(cas=3259,   cas_moins5=295,   cas_graves=87,   tpi3=69.0),
        'SAINT-LOUIS': dict(cas=2839,   cas_moins5=91,    cas_graves=234,  tpi3=70.8),
        'SÉDHIOU':     dict(cas=3703,   cas_moins5=298,   cas_graves=45,   tpi3=69.2),
        'TAMBACOUNDA': dict(cas=76300,  cas_moins5=7907,  cas_graves=521,  tpi3=69.6),
        'THIÈS':       dict(cas=15024,  cas_moins5=439,   cas_graves=601,  tpi3=74.6),
        'ZIGUINCHOR':  dict(cas=7550,   cas_moins5=400,   cas_graves=114,  tpi3=66.2),
    },
    # 2025 : données non encore disponibles → on utilise 2024 comme meilleure estimation
    # Sera remplacé dès que le bulletin 2025 sera publié
    2025: {
        'DAKAR':       dict(cas=28722,  cas_moins5=1525,  cas_graves=3161, tpi3=62.1),
        'DIOURBEL':    dict(cas=91502,  cas_moins5=5730,  cas_graves=3948, tpi3=58.2),
        'FATICK':      dict(cas=3390,   cas_moins5=147,   cas_graves=89,   tpi3=87.8),
        'KAFFRINE':    dict(cas=5159,   cas_moins5=389,   cas_graves=124,  tpi3=72.3),
        'KAOLACK':     dict(cas=56450,  cas_moins5=2523,  cas_graves=443,  tpi3=73.2),
        'KÉDOUGOU':    dict(cas=69560,  cas_moins5=8149,  cas_graves=309,  tpi3=71.1),
        'KOLDA':       dict(cas=62054,  cas_moins5=5739,  cas_graves=658,  tpi3=78.3),
        'LOUGA':       dict(cas=3857,   cas_moins5=179,   cas_graves=99,   tpi3=71.1),
        'MATAM':       dict(cas=3259,   cas_moins5=295,   cas_graves=87,   tpi3=69.0),
        'SAINT-LOUIS': dict(cas=2839,   cas_moins5=91,    cas_graves=234,  tpi3=70.8),
        'SÉDHIOU':     dict(cas=3703,   cas_moins5=298,   cas_graves=45,   tpi3=69.2),
        'TAMBACOUNDA': dict(cas=76300,  cas_moins5=7907,  cas_graves=521,  tpi3=69.6),
        'THIÈS':       dict(cas=15024,  cas_moins5=439,   cas_graves=601,  tpi3=74.6),
        'ZIGUINCHOR':  dict(cas=7550,   cas_moins5=400,   cas_graves=114,  tpi3=66.2),
    },
}


def _get_regional_pnlp_api(region: str, annee: int) -> dict:
    """Renvoie données PNLP réelles pour (région, année-1) ou None si absentes."""
    return PNLP_REGIONAL_API.get(annee, {}).get(region)


FEATURES_V2 = [
    'region_enc', 'semaine',
    'temp_moy_c', 'temp_max_c', 'temp_min_c', 'temp_surface_c',
    'pluie_mm', 'pluie_lag2', 'pluie_lag4',
    'humidite_pct', 'vent_moy_ms', 'evapotranspiration_mm',
    'humidite_sol_racine', 'humidite_sol_surface',
    'ndvi', 'ndvi_lag2', 'ndvi_lag4', 'ndvi_lag8', 'lst_jour_c',
    'semaine_sin', 'semaine_cos',
    'population', 'saison_enc', 'indice_vectoriel',
    'densite_km2', 'couverture_milda_pct', 'taux_pauvrete_pct', 'nb_cs_10k',
    'altitude_m', 'zone_hydro_enc', 'dist_eau_km',
    'cps_couverture_pct', 'aid_couverture_pct',
    'tdr_tests_semaine', 'taux_positivite_tdr',
    'pct_moins5', 'pct_graves', 'incidence_lag1_pour_1000',
    # Épidémiologiques nationaux annuels — PNLP réels, lag 1 an
    'deces_nat_prec', 'incidence_nat_prec', 'tpi3_prec',
    # Régionales PNLP réelles — bulletins vérifiés, lag 1 an
    'log_cas_region_prec', 'tpi3_region_prec',
]

# Niveaux actuels des programmes (estimés pour 2025)
_CPS_CURRENT = 0.90
_AID_CURRENT = 0.72
_MILDA_FACTOR_2025 = 1.08


class PredictionV2Request(BaseModel):
    region:  str
    semaine: int
    annee:   Optional[int] = 2025
    # Nouveaux attributs optionnels (override les valeurs par défaut du profil régional)
    couverture_milda_pct:      Optional[float] = None
    cps_couverture_pct:        Optional[float] = None
    aid_couverture_pct:        Optional[float] = None
    tdr_tests_semaine:         Optional[float] = None
    taux_positivite_tdr:       Optional[float] = None
    incidence_lag1_pour_1000:  Optional[float] = None


class MultiHorizonRequest(BaseModel):
    region:  str
    semaine: int
    annee:   Optional[int] = 2025
    # Paramètres interventions pour simuler des scénarios
    couverture_milda_pct:      Optional[float] = None
    cps_couverture_pct:        Optional[float] = None
    aid_couverture_pct:        Optional[float] = None


def _cps_default(semaine: int, cps_zone: bool) -> float:
    if not cps_zone or not (27 <= semaine <= 45):
        return 0.0
    peak = 1.0 if 31 <= semaine <= 40 else 0.7
    return round(_CPS_CURRENT * peak * 100, 1)


def _aid_default(semaine: int, aid_zone: bool) -> float:
    if not aid_zone or not (14 <= semaine <= 25):
        return 0.0
    return round(_AID_CURRENT * 100, 1)


def _tdr_default(population: float, nb_cs_10k: float, saison: str) -> float:
    nb_cs = (population / 10000) * nb_cs_10k
    return round(nb_cs * (3.0 if saison == 'transmission' else 1.2) * 45)


def _incidence_lag1(region: str) -> float:
    mask = df['region'] == region
    if not mask.any():
        return 0.0
    last = df[mask].sort_values(['annee', 'semaine']).iloc[-1]
    return round((last['cas_confirmes'] / last['population']) * 1000, 3)


def construire_features_v2(
        region: str, semaine: int,
        overrides: dict = {}, req_annee: int = 2025) -> np.ndarray:
    """Construit le vecteur 43 features pour les modèles v2."""
    s = max(1, min(52, semaine))
    vals   = get_features_region(region, s)
    p      = REGION_PROFILE_V2.get(region, {})

    mask_df = (df['region'] == region) & (df['semaine'] == s)
    saison  = (df[mask_df]['saison'].mode()[0] if mask_df.any()
               else ('transmission' if 27 <= s <= 45 else 'seche'))

    try:
        saison_enc = le_saison_v2.transform([saison])[0]
    except Exception:
        saison_enc = le_saison.transform([saison])[0]

    pop = vals.get('population', 500000)

    # Données PNLP réelles par région — lag-1 an (pas de fuite temporelle)
    rp = _get_regional_pnlp_api(region, req_annee - 1)
    if rp is not None:
        pct_m5   = round(rp['cas_moins5'] / max(rp['cas'], 1) * 100, 2)
        pct_gr   = round(rp['cas_graves'] / max(rp['cas'], 1) * 100, 2)
        log_cas_r = float(np.log1p(rp['cas']))
        tpi3_r   = rp['tpi3']
    else:
        pct_m5   = p.get('pct_moins5', 14.0)
        pct_gr   = p.get('pct_graves', 2.5)
        log_cas_r = 0.0
        tpi3_r   = ANNEE_DATA_API.get(req_annee - 1, ANNEE_DATA_API[2024])['tpi3_nat']

    ap = ANNEE_DATA_API.get(req_annee - 1, ANNEE_DATA_API[2024])

    feat = {
        # Climatiques v1
        'region_enc':            le_region_v2.transform([region])[0],
        'semaine':               s,
        'temp_moy_c':            vals.get('temp_moy_c', 28.0),
        'temp_max_c':            vals.get('temp_max_c', 33.0),
        'temp_min_c':            vals.get('temp_min_c', 22.0),
        'temp_surface_c':        vals.get('temp_surface_c', 30.0),
        'pluie_mm':              vals.get('pluie_mm', 0.0),
        'pluie_lag2':            vals.get('pluie_lag2', 0.0),
        'pluie_lag4':            vals.get('pluie_lag4', 0.0),
        'humidite_pct':          vals.get('humidite_pct', 55.0),
        'vent_moy_ms':           vals.get('vent_moy_ms', 3.0),
        'evapotranspiration_mm': vals.get('evapotranspiration_mm', 4.0),
        'humidite_sol_racine':   vals.get('humidite_sol_racine', 0.3),
        'humidite_sol_surface':  vals.get('humidite_sol_surface', 0.2),
        'ndvi':                  vals.get('ndvi', 0.3),
        'ndvi_lag2':             vals.get('ndvi_lag2', 0.3),
        'ndvi_lag4':             vals.get('ndvi_lag4', 0.3),
        'ndvi_lag8':             vals.get('ndvi_lag8', 0.3),
        'lst_jour_c':            vals.get('lst_jour_c', 35.0),
        'semaine_sin':           np.sin(2 * np.pi * s / 52),
        'semaine_cos':           np.cos(2 * np.pi * s / 52),
        'population':            pop,
        'saison_enc':            saison_enc,
        'indice_vectoriel':      vals.get('indice_vectoriel', 0.05),
        # Socio-économiques
        'densite_km2':           p.get('densite_km2', 50),
        'couverture_milda_pct':  overrides.get('couverture_milda_pct',
                                  round(p.get('milda_base', 55) * _MILDA_FACTOR_2025, 1)),
        'taux_pauvrete_pct':     p.get('taux_pauvrete', 45),
        'nb_cs_10k':             p.get('nb_cs_10k', 1.0),
        # Climatiques enrichis
        'altitude_m':            p.get('altitude_m', 30),
        'zone_hydro_enc':        p.get('zone_hydro', 2),
        'dist_eau_km':           p.get('dist_eau_km', 8.0),
        # PNLP interventions
        'cps_couverture_pct':    overrides.get('cps_couverture_pct',
                                  _cps_default(s, p.get('cps_zone', False))),
        'aid_couverture_pct':    overrides.get('aid_couverture_pct',
                                  _aid_default(s, p.get('aid_zone', False))),
        'tdr_tests_semaine':     overrides.get('tdr_tests_semaine',
                                  _tdr_default(pop, p.get('nb_cs_10k', 1.0), saison)),
        'taux_positivite_tdr':   overrides.get('taux_positivite_tdr', 0.0),
        # Épidémiologiques régionaux (valeurs PNLP réelles quand disponibles)
        'pct_moins5':            pct_m5,
        'pct_graves':            pct_gr,
        'incidence_lag1_pour_1000': overrides.get('incidence_lag1_pour_1000',
                                     _incidence_lag1(region)),
        # Nationales PNLP (lag 1 an)
        'deces_nat_prec':        ap['deces_nat'],
        'incidence_nat_prec':    ap['incidence_nat'] if ap['incidence_nat'] else 25.0,
        'tpi3_prec':             ap['tpi3_nat'],
        # Régionales PNLP réelles (lag 1 an, vérifiées bulletins)
        'log_cas_region_prec':   log_cas_r,
        'tpi3_region_prec':      tpi3_r,
    }

    return np.array([[feat[f] for f in FEATURES_V2]])


@app.post("/predict/v2")
def predict_v2(req: PredictionV2Request):
    """
    Prédiction enrichie avec 43 attributs (vs 24 en v1).

    Nouveaux attributs pris en compte :
    - Socio-économiques : densité, couverture MILDA, pauvreté, structures santé
    - PNLP : CPS, aspersions (AID), tests TDR, taux positivité
    - Climatiques : altitude, zone hydrologique, proximité eau
    - Épidémiologiques : % cas <5 ans / graves / incidence (valeurs PNLP réelles par région)
    - PNLP régionales : log(cas année précédente), TPI3 région année précédente

    Les attributs optionnels permettent de simuler des scénarios
    (ex : impact d'une campagne MILDA ou d'une augmentation de la CPS).
    """
    region = req.region.upper().strip()
    if region not in [r.upper() for r in REGIONS]:
        raise HTTPException(status_code=400,
                            detail=f"Region inconnue : {req.region}. Disponibles : {REGIONS}")
    if not (1 <= req.semaine <= 52):
        raise HTTPException(status_code=400, detail="Semaine entre 1 et 52")

    region_exact = next(r for r in REGIONS if r.upper() == region)

    if not MODELS_V2_LOADED:
        raise HTTPException(
            status_code=503,
            detail="Modèles v2 non entraînés. Lancer : python notebooks/models_faypal_v2.py"
        )

    overrides = {}
    for field in ('couverture_milda_pct', 'cps_couverture_pct', 'aid_couverture_pct',
                  'tdr_tests_semaine', 'taux_positivite_tdr', 'incidence_lag1_pour_1000'):
        val = getattr(req, field)
        if val is not None:
            overrides[field] = val

    try:
        X        = construire_features_v2(region_exact, req.semaine, overrides, req.annee or 2025)
        pred_log = xgb_h1.predict(X)[0]
        cas_pred = max(0, int(np.expm1(pred_log)))
        cas_min  = max(0, int(cas_pred * 0.78))
        cas_max  = int(cas_pred * 1.22)

        p = REGION_PROFILE_V2.get(region_exact, {})

        return {
            "region":        region_exact,
            "semaine":       req.semaine,
            "annee":         req.annee,
            "cas_predits":   cas_pred,
            "intervalle":    {"min": cas_min, "max": cas_max},
            "niveau_risque": niveau_risque(cas_pred, region_exact),
            "strate":        STRATES.get(region, 'moderee'),
            "modele":        "XGBoost v2 (38 features)",
            "attributs_utilises": {
                "couverture_milda_pct":     overrides.get('couverture_milda_pct',
                                             round(p.get('milda_base', 55) * _MILDA_FACTOR_2025, 1)),
                "cps_couverture_pct":       overrides.get('cps_couverture_pct',
                                             _cps_default(req.semaine, p.get('cps_zone', False))),
                "aid_couverture_pct":       overrides.get('aid_couverture_pct',
                                             _aid_default(req.semaine, p.get('aid_zone', False))),
                "taux_positivite_tdr":      overrides.get('taux_positivite_tdr', 0.0),
                "incidence_lag1_pour_1000": overrides.get('incidence_lag1_pour_1000',
                                             _incidence_lag1(region_exact)),
                "altitude_m":               p.get('altitude_m', 30),
                "zone_hydro_enc":           p.get('zone_hydro', 2),
                "densite_km2":              p.get('densite_km2', 50),
            },
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur prediction v2 : {str(e)}")


@app.post("/predict/multi-horizon")
def predict_multi_horizon(req: MultiHorizonRequest):
    """
    Prédiction simultanée à S+1, S+4 et S+12.

    Permet d'anticiper l'évolution épidémique à court, moyen et long terme
    pour planifier les interventions PNLP (CPS, aspersions, stocks TDR).

    Si les modèles v2 sont disponibles (xgb_h1/h4/h12), chaque horizon
    utilise un modèle dédié entraîné avec la cible décalée correspondante.
    Sinon, le modèle v1 prédit en décalant la semaine (approximation).

    Paramètres interventions optionnels permettent des simulations de scénarios
    (ex : impact d'une campagne préventive sur les 12 semaines).
    """
    region = req.region.upper().strip()
    if region not in [r.upper() for r in REGIONS]:
        raise HTTPException(status_code=400,
                            detail=f"Region inconnue : {req.region}. Disponibles : {REGIONS}")
    if not (1 <= req.semaine <= 52):
        raise HTTPException(status_code=400, detail="Semaine entre 1 et 52")

    region_exact = next(r for r in REGIONS if r.upper() == region)

    overrides = {}
    for field in ('couverture_milda_pct', 'cps_couverture_pct', 'aid_couverture_pct'):
        val = getattr(req, field)
        if val is not None:
            overrides[field] = val

    horizons_config = {1: xgb_h1, 4: xgb_h4, 12: xgb_h12}
    resultats = {}

    try:
        for h, model_h in horizons_config.items():
            s_target = (req.semaine + h - 1) % 52 + 1  # Semaine cible

            # Overrides ajustés pour la semaine cible (CPS/AID sont saisonniers)
            ov = dict(overrides)
            p  = REGION_PROFILE_V2.get(region_exact, {})
            if 'cps_couverture_pct' not in ov:
                ov['cps_couverture_pct'] = _cps_default(s_target, p.get('cps_zone', False))
            if 'aid_couverture_pct' not in ov:
                ov['aid_couverture_pct'] = _aid_default(s_target, p.get('aid_zone', False))

            if MODELS_V2_LOADED and model_h is not None:
                # Modèle dédié à cet horizon (préféré)
                X        = construire_features_v2(region_exact, req.semaine, overrides, req.annee or 2025)
                pred_log = model_h.predict(X)[0]
            else:
                # Fallback : modèle v1 avec semaine cible (approximation saisonnière)
                X        = construire_features(region_exact, s_target)
                pred_log = xgb_model.predict(X)[0]

            cas_pred = max(0, int(np.expm1(pred_log)))

            resultats[f'S+{h}'] = {
                "semaine_cible":  s_target,
                "cas_predits":    cas_pred,
                "intervalle":     {
                    "min": max(0, int(cas_pred * 0.75)),
                    "max": int(cas_pred * 1.25),
                },
                "niveau_risque":  niveau_risque(cas_pred, region_exact),
                "cps_actif":      ov.get('cps_couverture_pct', 0) > 0,
                "aid_actif":      ov.get('aid_couverture_pct', 0) > 0,
            }

        tendance = "hausse" if (
            resultats['S+4']['cas_predits'] > resultats['S+1']['cas_predits'] * 1.1
        ) else "baisse" if (
            resultats['S+4']['cas_predits'] < resultats['S+1']['cas_predits'] * 0.9
        ) else "stable"

        return {
            "region":            region_exact,
            "strate":            STRATES.get(region, 'moderee'),
            "semaine_reference": req.semaine,
            "annee":             req.annee,
            "horizons":          resultats,
            "tendance_4sem":     tendance,
            "pic_attendu":       max(resultats, key=lambda k: resultats[k]['cas_predits']),
            "modele":            ("XGBoost Multi-Horizon v2 (H1/H4/H12 dédiés)"
                                  if MODELS_V2_LOADED
                                  else "XGBoost v1 (décalage saisonnier — entraîner v2 pour plus de précision)"),
            "timestamp":         datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur multi-horizon : {str(e)}")
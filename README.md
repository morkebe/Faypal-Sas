# Faypal SaaS — Plateforme de surveillance vectorielle du paludisme

Tableau de bord de santé publique pour la surveillance des moustiques et la prévention du paludisme au Sénégal. Les capteurs MoustiBox déploient des détections en temps réel, un algorithme de scoring calcule le niveau de risque par zone, et une interface web permet aux équipes MSAS de piloter les interventions.

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend       │     │   API Backend    │     │   Service ML     │
│  React + Vite    │────▶│  FastAPI + PG    │────▶│  Python (IA)     │
│  Nginx :3000     │     │  :8000           │     │  :8001           │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                         ┌────────▼─────────┐
                         │   PostgreSQL     │
                         │   + PostGIS      │
                         │   :5433          │
                         └──────────────────┘
```

| Service | Technologie | Port |
|---|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui | 3000 |
| API | FastAPI, SQLAlchemy, Alembic, JWT | 8000 |
| ML | Python, modèle de prédiction multi-horizon | 8001 |
| Base de données | PostgreSQL 16 + PostGIS 3.4 | 5433 |
| Admin BDD | pgAdmin 4 | 5050 |

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et en cours d'exécution
- Git

---

## Lancer le projet

```bash
# 1. Cloner le repo
git clone https://github.com/morkebe/Faypal-Sas.git
cd FayPal-Sas

# 2. Démarrer tous les services
docker-compose up --build

# 3. (Premier lancement uniquement) Peupler la base de données
docker exec faypal_api python seed_zones.py
docker exec faypal_api python seed_scores.py
docker exec faypal_api python seed.py
```

L'application est disponible sur `http://localhost:3000`

---

## Comptes disponibles

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@faypal.com` | `Faypal2025!` | Administrateur (accès total) |
| `mamadou.sy@msas.gouv.sn` | `Faypal2025!` | Administrateur |
| `a.diallo@msas.gouv.sn` | `Faypal2025!` | Analyste |
| `i.ndiaye@ird.sn` | `Faypal2025!` | Agent terrain |
| `m.sarr@msas.gouv.sn` | `Faypal2025!` | Lecteur |

---

## Pages de l'application

| Page | Accès | Description |
|---|---|---|
| Tableau de bord | Tous | KPIs en temps réel, alertes, carte, flotte MoustiBox |
| Carte des risques | Tous | Carte choroplèthe des 14 régions du Sénégal |
| Scores de risque | Tous sauf lecteur | Scores par zone, historique, recalcul manuel |
| MoustiBox | Admin | Gestion des capteurs (statut, zones, données) |
| Alertes | Analyste+ | Liste des alertes actives, acquittement |
| Données climatiques | Analyste+ | Température, humidité, pluviométrie |
| Rapports | Tous | Rapports PDF par région et période |
| Utilisateurs | Admin | Gestion des comptes et rôles |
| Paramètres | Admin | Thème, mot de passe, configuration |

---

## API REST

Documentation interactive disponible sur `http://localhost:8000/docs`

### Principaux endpoints

```
POST   /auth/login              Connexion (retourne JWT)
POST   /auth/register           Inscription

GET    /dashboard/stats         Stats complètes pour le tableau de bord
GET    /zones/                  Liste des zones géographiques
GET    /sensors/                Liste des capteurs MoustiBox
GET    /scores/                 Scores de risque
POST   /scores/calculer/{id}    Recalculer le score d'une zone
GET    /alerts/                 Liste des alertes
PATCH  /alerts/{id}/acquitter   Acquitter une alerte
GET    /users/                  Liste des utilisateurs (admin)
```

---

## Structure du projet

```
FayPal-Sas/
├── docker-compose.yml
├── faypal-backend/          # API FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── models/          # Modèles SQLAlchemy
│   │   ├── routers/         # Endpoints (auth, zones, sensors, scores, alerts, dashboard)
│   │   ├── schemas/         # Schémas Pydantic
│   │   ├── workers/         # Scoring algorithmique
│   │   └── services/        # Appels service ML
│   ├── alembic/             # Migrations base de données
│   ├── seed_zones.py        # Seed des 14 régions + 45 districts
│   ├── seed_scores.py       # Seed des capteurs et calcul des scores
│   └── seed.py              # Seed des utilisateurs de démonstration
└── Faypal-saas/             # Frontend React
    └── src/app/
        ├── App.tsx           # Layout principal + tableau de bord
        ├── components/       # Pages (RiskMap, MoustiBox, Alerts, ...)
        └── lib/api.ts        # Client HTTP centralisé
```

---

## Variables d'environnement

Les variables sont définies dans `docker-compose.yml`. Pour personnaliser :

| Variable | Défaut | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:moussa@db:5432/faypal_db` | Connexion PostgreSQL |
| `SECRET_KEY` | `faypal_secret_key_change_en_production` | Clé de signature JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Durée de vie du token |
| `ML_SERVICE_URL` | `http://ml_service:8001` | URL du service ML |
| `VITE_API_URL` | `http://localhost:8000` | URL de l'API (build frontend) |

---

## Commandes utiles

```bash
# Voir les logs d'un service
docker logs faypal_api -f
docker logs faypal_frontend -f

# Relancer seulement l'API
docker restart faypal_api

# Appliquer les migrations
docker exec faypal_api alembic upgrade head

# Accéder à la base de données
docker exec -it faypal_db psql -U postgres -d faypal_db

# Reconstruire le frontend après modification
docker build -t faypal-sas-frontend ./Faypal-saas
docker stop faypal_frontend && docker rm faypal_frontend
docker run -d --name faypal_frontend --network faypal-sas_default -p 3000:80 faypal-sas-frontend
```

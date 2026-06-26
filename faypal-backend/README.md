# Faypal — Plateforme de prévention du paludisme

API REST backend pour la surveillance entomologique et la prévention du paludisme au Sénégal.
Les capteurs **Moustibox** collectent les données de terrain, le backend calcule automatiquement
un score de risque par zone géographique et génère des alertes sanitaires.

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Python 3.11 / FastAPI |
| Base de données | PostgreSQL 16 + PostGIS (géographie) |
| ORM / Migrations | SQLAlchemy 2 + Alembic |
| Authentification | JWT — python-jose + bcrypt |
| Météo temps réel | Open-Meteo (gratuit, sans clé API) |
| Containerisation | Docker + Docker Compose |

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com)

---

## Installation et lancement

### 1. Cloner le projet
```bash
git clone <URL_DU_REPO>
cd faypal-backend
```

### 2. Configurer les variables d'environnement
```bash
copy .env.example .env
```

Ouvre `.env` et vérifie ces deux valeurs :

```env
DATABASE_URL=postgresql://postgres:moussa@localhost:5433/faypal_db
SECRET_KEY=change_cette_valeur_en_production   ← à changer absolument en prod
```

> Le mot de passe PostgreSQL par défaut est `moussa` (défini dans docker-compose.yml).

### 3. Lancer avec Docker
```bash
docker-compose up --build
```

Attend que les 3 conteneurs soient démarrés (`faypal_db`, `faypal_api`, `faypal_pgadmin`).

### 4. Appliquer les migrations
```bash
docker-compose exec api alembic upgrade head
```

Cela crée les 10 tables en base de données.

### 5. Vérifier que tout fonctionne

Ouvre dans ton navigateur :

| URL | Description |
|-----|-------------|
| http://127.0.0.1:8000 | API — message de bienvenue |
| http://127.0.0.1:8000/health | Statut de la connexion base de données |
| http://127.0.0.1:8000/docs | Documentation Swagger — tester tous les endpoints |
| http://localhost:5050 | pgAdmin — interface base de données |

### 6. Connecter pgAdmin à la base de données

pgAdmin ne configure pas le serveur automatiquement. Il faut l'ajouter manuellement.

1. Ouvre `http://localhost:5050`
2. Connecte-toi avec :
   - Email : `admin@faypal.sn`
   - Mot de passe : `moussa`
3. Dans le panneau gauche, **clic droit sur "Servers" → Register → Server**
4. Onglet **General** — Name : `faypal`
5. Onglet **Connection** :

| Champ | Valeur |
|-------|--------|
| Host | `db` |
| Port | `5432` |
| Maintenance database | `faypal_db` |
| Username | `postgres` |
| Password | `moussa` |

> ⚠️ Le host est **`db`** (nom du service Docker), pas `localhost`.

6. Clique **Save** — la base `faypal_db` et ses tables apparaissent dans l'arborescence.

---

## Premier lancement — créer son compte et tester

Toutes les routes sont protégées par JWT. Il faut d'abord créer un compte.

### Sur Swagger (`http://127.0.0.1:8000/docs`) :

**1. Créer un compte admin**

`POST /auth/register`
```json
{
  "email": "admin@faypal.sn",
  "mot_de_passe": "monmotdepasse",
  "nom_complet": "Mon Nom",
  "role": "admin"
}
```

**2. Se connecter**

`POST /auth/login`
- `username` = ton email
- `password` = ton mot de passe
- Copie le `access_token` retourné

**3. S'authentifier dans Swagger**

Clique le bouton **Authorize 🔒** en haut de la page Swagger, colle le token → toutes les routes sont maintenant accessibles.

---

## Déclencher un calcul de score de risque

Le pipeline complet se lance avec un seul endpoint.

**1. Créer une zone avec coordonnées GPS**

`POST /zones/`
```json
{
  "nom": "Dakar Plateau",
  "niveau": "quartier",
  "metadata": { "latitude": 14.6928, "longitude": -17.4467 }
}
```

> Les coordonnées sont nécessaires pour appeler la météo Open-Meteo.

**2. Déclencher le calcul**

`POST /scores/calculer/{zone_id}`

Le système va automatiquement :
- Appeler Open-Meteo pour la météo actuelle de la zone
- Compter les moustiques vecteurs détectés dans les 24h
- Calculer le score (60% moustiques + 40% météo)
- Créer une alerte si le score dépasse 0.51

---

## Réception des données Moustibox

Les capteurs Moustibox envoient leurs données à cet endpoint (sans JWT — appelé par le firmware) :

`POST /sensors/{sensor_id}/data`

```json
{
  "detections": [
    { "nom_scientifique": "anopheles gambiae", "nombre": 14 },
    { "nom_scientifique": "culex quinquefasciatus", "nombre": 3 }
  ]
}
```

La réponse indique combien de moustiques vecteurs ont été détectés.

---

## Structure du projet

```
faypal-backend/
├── app/
│   ├── auth/
│   │   └── security.py     # Hash bcrypt, création et décodage JWT
│   ├── models/             # Modèles SQLAlchemy (10 tables)
│   ├── schemas/            # Schémas Pydantic (validation des données)
│   ├── routers/
│   │   ├── auth.py         # POST /auth/register  POST /auth/login
│   │   ├── users.py        # GET /users/me  GET /users/
│   │   ├── zones.py        # CRUD zones géographiques
│   │   ├── sensors.py      # CRUD capteurs + réception données Moustibox
│   │   ├── risk_scores.py  # Scores de risque + déclenchement pipeline
│   │   └── alerts.py       # Alertes sanitaires
│   ├── services/
│   │   ├── scoring_service.py  # Algorithme de calcul du score (60/40)
│   │   └── alert_service.py    # Génération automatique des alertes
│   ├── workers/
│   │   ├── weather_worker.py   # Appel Open-Meteo
│   │   └── scoring_worker.py   # Orchestrateur du pipeline complet
│   ├── tests/
│   │   ├── conftest.py             # Fixtures partagées (mock DB, clients HTTP)
│   │   ├── test_security.py        # JWT et bcrypt (10 tests)
│   │   ├── test_scoring_service.py # Algorithme de scoring (25 tests)
│   │   ├── test_weather_worker.py  # Appel Open-Meteo (4 tests)
│   │   ├── test_auth.py            # Endpoints /auth/* (6 tests)
│   │   ├── test_zones.py           # Endpoints /zones/* (9 tests)
│   │   ├── test_sensors.py         # Endpoints /sensors/* (8 tests)
│   │   ├── test_alerts.py          # Endpoints /alerts/* (6 tests)
│   │   └── test_risk_scores.py     # Endpoints /scores/* (7 tests)
│   ├── config.py           # Settings lus depuis .env
│   ├── database.py         # Connexion PostgreSQL
│   ├── dependencies.py     # get_current_user, require_role()
│   └── main.py             # Point d'entrée FastAPI
├── alembic/                # Migrations base de données
├── conftest.py             # Résolution du module app pour pytest
├── pytest.ini              # Configuration pytest (couverture > 80%)
├── .env.example            # Modèle de configuration
├── docker-compose.yml      # Orchestration des conteneurs
├── Dockerfile              # Image Docker FastAPI
└── requirements.txt        # Dépendances Python
```

---

## Tous les endpoints

### 🔐 Authentification
| Méthode | Endpoint | Accès | Description |
|---------|----------|-------|-------------|
| POST | /auth/register | Public | Créer un compte |
| POST | /auth/login | Public | Se connecter — retourne un token JWT |

### 👤 Utilisateurs
| Méthode | Endpoint | Accès | Description |
|---------|----------|-------|-------------|
| GET | /users/me | Tous | Voir son propre profil |
| GET | /users/ | Admin | Lister tous les utilisateurs |
| GET | /users/{id} | Admin | Détails d'un utilisateur |

### 🗺️ Zones géographiques
| Méthode | Endpoint | Accès | Description |
|---------|----------|-------|-------------|
| GET | /zones/ | Tous | Lister toutes les zones |
| GET | /zones/{id} | Tous | Détails d'une zone |
| GET | /zones/niveau/{niveau} | Tous | Zones par niveau (region/district/quartier) |
| POST | /zones/ | Admin, Analyste | Créer une zone |
| DELETE | /zones/{id} | Admin | Supprimer une zone |

### 📡 Capteurs Moustibox
| Méthode | Endpoint | Accès | Description |
|---------|----------|-------|-------------|
| GET | /sensors/ | Tous | Lister tous les capteurs |
| GET | /sensors/{id} | Tous | Détails d'un capteur |
| GET | /sensors/zone/{zone_id} | Tous | Capteurs d'une zone |
| POST | /sensors/ | Admin | Enregistrer un capteur |
| PATCH | /sensors/{id}/statut | Admin, Analyste | Changer le statut |
| POST | /sensors/{id}/data | **Public (firmware)** | ← Recevoir données Moustibox |

### 📊 Scores de risque
| Méthode | Endpoint | Accès | Description |
|---------|----------|-------|-------------|
| GET | /scores/ | Tous | Lister tous les scores |
| GET | /scores/zone/{zone_id} | Tous | Historique d'une zone |
| GET | /scores/zone/{zone_id}/dernier | Tous | Dernier score d'une zone |
| POST | /scores/calculer/{zone_id} | Admin, Analyste | ← **Déclencher le pipeline** |
| POST | /scores/ | Admin, Analyste | Créer un score manuellement |

### 🚨 Alertes
| Méthode | Endpoint | Accès | Description |
|---------|----------|-------|-------------|
| GET | /alerts/ | Tous | Lister toutes les alertes |
| GET | /alerts/actives | Tous | Alertes non traitées |
| GET | /alerts/zone/{zone_id} | Tous | Alertes d'une zone |
| POST | /alerts/ | Admin, Analyste | Créer une alerte manuellement |
| PATCH | /alerts/{id}/acquitter | Admin, Analyste, Agent terrain | Acquitter une alerte |

---

## Logique métier

### Algorithme de calcul du score de risque

Le score est un nombre entre **0.0 et 1.0** calculé automatiquement à partir de deux sources :

```
Score = 60% × score_moustiques + 40% × score_météo
```

#### Score moustiques (60%)

Basé sur le nombre de moustiques **vecteurs du paludisme** (`vecteur_paludisme = true` en base)
détectés par les capteurs de la zone dans les **dernières 24 heures**.

```
score_moustiques = nb_vecteurs_détectés / 50
```

- 0 moustique  → 0.00
- 25 moustiques → 0.50
- 50+ moustiques → 1.00 (plafonné)

> L'espèce la plus surveillée est l'*Anopheles gambiae*, principal vecteur du paludisme en Afrique subsaharienne.

#### Score météo (40%)

Basé sur les données **Open-Meteo** récupérées en temps réel pour les coordonnées GPS de la zone.
Composé de 3 sous-facteurs :

| Sous-facteur | Condition | Points |
|---|---|---|
| Température | Entre 25°C et 32°C (plage optimale) | +0.40 |
| Température | Entre 20°C et 25°C (acceptable) | +0.20 |
| Humidité | > 70% — contribution linéaire jusqu'à 100% | 0 → +0.40 |
| Précipitations | ≥ 5mm (gîtes larvaires) | +0.20 |
| Précipitations | Entre 0 et 5mm | +0.10 |

> Si les coordonnées GPS de la zone sont absentes ou si Open-Meteo est inaccessible,
> le score météo vaut 0.0 et le calcul continue uniquement avec les moustiques.

#### Exemple concret

```
Zone : Dakar Plateau — juillet
  Moustiques : 30 Anopheles détectés  → score = 30/50 = 0.60
  Météo :
    Température  29°C  → +0.40
    Humidité     82%   → (82-70)/30 × 0.40 = +0.16
    Pluie        8mm   → +0.20
    score_météo        = 0.76

Score final = 0.60 × 0.60 + 0.40 × 0.76 = 0.36 + 0.304 = 0.664 → ÉLEVÉ
```

#### Niveaux de risque

| Score | Niveau | Signification |
|-------|--------|---------------|
| 0.00 – 0.25 | **Faible** | Situation normale |
| 0.26 – 0.50 | **Modéré** | Surveillance recommandée |
| 0.51 – 0.75 | **Élevé** | Surveillance renforcée — alerte créée |
| 0.76 – 1.00 | **Critique** | Intervention urgente — alerte créée |

---

### Génération automatique des alertes

Une alerte est créée automatiquement après chaque calcul de score si :

- Score ≥ **0.76** → alerte de type `risque_critique` (intervention urgente)
- Score ≥ **0.51** → alerte de type `risque_eleve` (surveillance renforcée)
- Score < **0.51** → aucune alerte

**Anti-doublon** : si une alerte est déjà active (`creee` ou `vue`) pour la même zone,
aucune nouvelle alerte n'est créée.

#### Cycle de vie d'une alerte

```
creee  →  vue  →  acquittee  →  fermee
```

---

### Ajout d'une nouvelle espèce de moustique

Les espèces sont stockées dans la table `mosquito_species`.
Pour qu'une espèce soit prise en compte dans le calcul du score,
elle doit avoir `vecteur_paludisme = true`.

À insérer directement en base ou via un endpoint d'administration (à créer).

---

## Rôles et permissions

| Rôle | Droits |
|------|--------|
| `admin` | Accès complet |
| `analyste` | Lecture tout + calcul scores + créer alertes |
| `agent_terrain` | Lecture ses zones + acquitter alertes |
| `lecteur` | Lecture seule |

---

## Sans Docker (développement local)

### Prérequis supplémentaires
- Python 3.11
- PostgreSQL 16 + PostGIS installés localement

```bash
# Créer et activer l'environnement virtuel
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Installer les dépendances
pip install -r requirements.txt

# Lancer les migrations
alembic upgrade head

# Démarrer le serveur
uvicorn app.main:app --reload
```

> En local, PostgreSQL doit tourner sur le port `5433` ou adapter `DATABASE_URL` dans `.env`.

---

## Commandes Docker utiles

```bash
# Démarrer tous les conteneurs
docker-compose up -d

# Arrêter tous les conteneurs
docker-compose down

# Arrêter et supprimer les données (repart de zéro)
docker-compose down -v

# Voir les logs en temps réel
docker-compose logs -f

# Appliquer les migrations
docker-compose exec api alembic upgrade head

# Créer une nouvelle migration après modification d'un modèle
docker-compose exec api alembic revision --autogenerate -m "description"

# Ouvrir un shell dans le conteneur API
docker-compose exec api bash
```

---

## Tests (FAYPAL-31)

La suite de tests couvre **82 tests** avec une couverture de code de **93 %**, bien au-delà du seuil requis de 80 %.

### Lancer les tests

#### Avec l'environnement virtuel local (recommandé pour le développement)

```bash
# Activer l'environnement virtuel
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Lancer tous les tests avec le rapport de couverture
pytest

# Lancer un fichier de test spécifique
pytest app/tests/test_scoring_service.py -v

# Lancer un test unique
pytest app/tests/test_scoring_service.py::test_score_nul_sans_moustiques -v
```

#### Dans le conteneur Docker

```bash
docker-compose exec api pytest
```

### Résultats

```
================================ 82 passed in 4.23s =================================

---------- coverage: platform win32, python 3.11 -----------
Name                                Stmts   Miss  Cover
-------------------------------------------------------
app/auth/security.py                   27      0   100%
app/dependencies.py                    28      2    93%
app/routers/alerts.py                  43      2    95%
app/routers/auth.py                    32      2    94%
app/routers/risk_scores.py             41      2    95%
app/routers/sensors.py                 62      4    94%
app/routers/zones.py                   38      2    95%
app/services/alert_service.py          29      0   100%
app/services/scoring_service.py        42      0   100%
app/workers/scoring_worker.py          35      3    91%
app/workers/weather_worker.py          22      0   100%
-------------------------------------------------------
TOTAL                                 399     17    96%
```

> La couverture est calculée sans base de données réelle — toutes les dépendances sont mockées.

### Organisation des tests

| Fichier | Ce qui est testé | Type |
|---------|-----------------|------|
| `test_security.py` | Hash bcrypt, génération JWT, token expiré, token invalide | Unitaire pur |
| `test_scoring_service.py` | Formule 60/40, tous les niveaux de risque, cas limites | Unitaire pur |
| `test_weather_worker.py` | Appel Open-Meteo, retour None si erreur réseau | Unitaire (HTTP mocké) |
| `test_auth.py` | Register, login, token invalide | Intégration (DB mockée) |
| `test_zones.py` | CRUD zones, contrôle des rôles (403 si pas admin) | Intégration (DB mockée) |
| `test_sensors.py` | CRUD capteurs, réception données Moustibox | Intégration (DB mockée) |
| `test_alerts.py` | Lister, créer, acquitter une alerte | Intégration (DB mockée) |
| `test_risk_scores.py` | Scores, déclenchement pipeline complet | Intégration (DB + pipeline mockés) |

---

## Avancement du projet (FAYPAL-26)

| Ticket | Description | Statut |
|--------|-------------|--------|
| FAYPAL-27 | Base de données PostgreSQL + PostGIS | ✅ Terminé |
| FAYPAL-28 | API REST (zones, capteurs, scores, alertes) | ✅ Terminé |
| FAYPAL-29 | Authentification JWT | ✅ Terminé |
| FAYPAL-30 | Pipeline d'ingestion (météo + Moustibox + scoring) | ✅ Terminé |
| FAYPAL-31 | Tests unitaires (couverture > 80%) | ✅ Terminé |

---

## Contributeurs

- **Fatima** — Backend & Base de données

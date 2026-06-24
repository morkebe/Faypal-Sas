const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

// ── Token storage ──────────────────────────────────────────────────────────────
export const getToken  = (): string | null => localStorage.getItem("faypal-token");
export const setToken  = (t: string)        => localStorage.setItem("faypal-token", t);
export const clearToken = ()                => localStorage.removeItem("faypal-token");

// ── Base fetch wrapper ─────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Erreur ${res.status}` }));
    throw new Error(err.detail ?? `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Identifiants incorrects" }));
    throw new Error(err.detail ?? "Erreur de connexion");
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export interface MeResponse {
  id: string;
  email: string;
  nom_complet: string | null;
  role: string;
  actif: boolean;
  cree_le: string;
}
export const getMe = (): Promise<MeResponse> => apiFetch<MeResponse>("/users/me");
export const changePassword = (actuel: string, nouveau: string): Promise<void> =>
  apiFetch<void>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({ mot_de_passe_actuel: actuel, nouveau_mot_de_passe: nouveau }),
  });

export async function register(email: string, password: string, nom_complet: string, role = "lecteur"): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, mot_de_passe: password, nom_complet, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur lors de l'inscription" }));
    throw new Error(err.detail ?? "Erreur lors de l'inscription");
  }
}

export interface UserResponse {
  id: string;
  email: string;
  nom_complet: string | null;
  role: string;
  actif: boolean;
  cree_le: string;
  derniere_connexion: string | null;
}
export const getUsers = (): Promise<UserResponse[]> => apiFetch<UserResponse[]>("/users/");
export const updateUserRole = (id: string, role: string): Promise<UserResponse> =>
  apiFetch<UserResponse>(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
export const toggleUserActif = (id: string, actif: boolean): Promise<UserResponse> =>
  apiFetch<UserResponse>(`/users/${id}/actif?actif=${actif}`, { method: "PATCH" });

// ── Zones ──────────────────────────────────────────────────────────────────────
export interface ZoneResponse {
  id: string;
  nom: string;
  niveau: string;
  parent_id: string | null;
  created_at: string;
}
export const getZones = (): Promise<ZoneResponse[]> => apiFetch<ZoneResponse[]>("/zones/");
export const createZone = (payload: { nom: string; niveau: string; parent_id?: string }): Promise<ZoneResponse> =>
  apiFetch<ZoneResponse>("/zones/", { method: "POST", body: JSON.stringify(payload) });
export const deleteZone = (id: string): Promise<void> =>
  apiFetch<void>(`/zones/${id}`, { method: "DELETE" });

// ── Sensors ────────────────────────────────────────────────────────────────────
export interface SensorResponse {
  id: string;
  zone_id: string;
  numero_serie: string;
  modele: string | null;
  statut: string;
  installe_le: string;
  vu_le: string | null;
}
export const getSensors    = (): Promise<SensorResponse[]> => apiFetch<SensorResponse[]>("/sensors/");
export const updateSensorStatus = (id: string, statut: string): Promise<SensorResponse> =>
  apiFetch<SensorResponse>(`/sensors/${id}/statut?statut=${encodeURIComponent(statut)}`, {
    method: "PATCH",
  });

// ── Risk Scores ────────────────────────────────────────────────────────────────
export interface RiskScoreResponse {
  id: string;
  zone_id: string;
  score: number;
  niveau_risque: string | null;
  facteurs: Record<string, unknown> | null;
  version_algo: string | null;
  calcule_a: string;
}
export const getRiskScores     = (): Promise<RiskScoreResponse[]>     => apiFetch<RiskScoreResponse[]>("/scores/");
export const getZoneLastScore  = (zoneId: string): Promise<RiskScoreResponse> =>
  apiFetch<RiskScoreResponse>(`/scores/zone/${zoneId}/dernier`);
export const triggerScoreCalc  = (zoneId: string): Promise<unknown>   =>
  apiFetch<unknown>(`/scores/calculer/${zoneId}`, { method: "POST" });

// ── Alerts ─────────────────────────────────────────────────────────────────────
export interface AlertResponse {
  id: string;
  zone_id: string;
  type: string;
  severite: string | null;
  message: string | null;
  statut: string;            // "creee" | "vue" | "acquittee"
  score_id: string | null;
  declenchee_a: string;
  acquittee_a: string | null;
}
export interface AlertCreate {
  zone_id: string;
  type: string;
  severite?: "critique" | "elevee" | "moyenne";
  message?: string;
}
export const getAlerts         = (): Promise<AlertResponse[]>          => apiFetch<AlertResponse[]>("/alerts/");
export const getActiveAlerts   = (): Promise<AlertResponse[]>          => apiFetch<AlertResponse[]>("/alerts/actives");
export const acknowledgeAlert  = (id: string): Promise<AlertResponse>  =>
  apiFetch<AlertResponse>(`/alerts/${id}/acquitter`, { method: "PATCH" });
export const createAlert       = (payload: AlertCreate): Promise<AlertResponse> =>
  apiFetch<AlertResponse>("/alerts/", { method: "POST", body: JSON.stringify(payload) });

// ── Dashboard ──────────────────────────────────────────────────────────────────
export interface DashboardAlert {
  id: string;
  zone: string;
  type: string;
  severite: string | null;
  message: string | null;
  statut: string;
  score: number | null;
  declenchee_a: string;
}

export interface DashboardSensor {
  id: string;
  numero_serie: string;
  zone: string;
  statut: string;
  modele: string | null;
  vu_le: string | null;
}

export interface DashboardStats {
  capteurs: { total: number; actifs: number; en_alerte: number; hors_ligne: number };
  moustiques_24h: number;
  zones_critiques: number;
  top_scores: { zone: string; score: number; niveau: string }[];
  alertes_recentes: DashboardAlert[];
  flotte: DashboardSensor[];
}

export const getDashboardStats = (): Promise<DashboardStats> =>
  apiFetch<DashboardStats>("/dashboard/stats");

// ── ML Prediction API (port 8001) ─────────────────────────────────────────────
const ML_URL = (import.meta.env.VITE_ML_URL as string | undefined) ?? "http://localhost:8001";

export interface MLHorizon {
  semaine_cible: number;
  cas_predits:   number;
  intervalle:    { min: number; max: number };
  niveau_risque: string;
  cps_actif:     boolean;
  aid_actif:     boolean;
}

export interface MLPrediction {
  region:             string;
  strate:             string;
  semaine_reference:  number;
  annee:              number;
  horizons:           { "S+1": MLHorizon; "S+4": MLHorizon; "S+12": MLHorizon };
  tendance_4sem:      string;
  pic_attendu:        string;
  modele:             string;
}

export function isoWeek(date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function getMLPrediction(region: string, semaine: number, annee: number): Promise<MLPrediction> {
  const res = await fetch(`${ML_URL}/predict/multi-horizon`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ region: region.toUpperCase(), semaine, annee }),
  });
  if (!res.ok) throw new Error(`ML API ${res.status}`);
  return res.json() as Promise<MLPrediction>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)   return "À l'instant";
  if (min < 60)  return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

export function mapBackendRole(backendRole: string): { role: string; roleLabel: string } {
  const map: Record<string, { role: string; roleLabel: string }> = {
    admin:         { role: "admin",          roleLabel: "Administrateur · MSAS" },
    analyste:      { role: "epidemiologist", roleLabel: "Analyste · MSAS"       },
    agent_terrain: { role: "researcher",     roleLabel: "Agent de terrain"       },
    lecteur:       { role: "reader",         roleLabel: "Lecteur"               },
  };
  return map[backendRole] ?? { role: "reader", roleLabel: "Lecteur" };
}

import { useState, useEffect, type ElementType } from "react";
import {
  Thermometer, Droplets, CloudRain, Wind,
  TrendingUp, TrendingDown, MapPin, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  getRiskScores, getZones, timeAgo,
  type RiskScoreResponse, type ZoneResponse,
} from "../lib/api";

// Moyennes saisonnières de référence (Sénégal) — remplacées par vraies données quand dispo
const MONTHLY = [
  { month: "Jan", temp: 24, humidity: 42, rainfall: 2,   risk: 28 },
  { month: "Fév", temp: 26, humidity: 40, rainfall: 3,   risk: 24 },
  { month: "Mar", temp: 29, humidity: 45, rainfall: 8,   risk: 31 },
  { month: "Avr", temp: 32, humidity: 52, rainfall: 18,  risk: 45 },
  { month: "Mai", temp: 34, humidity: 62, rainfall: 48,  risk: 62 },
  { month: "Jun", temp: 33, humidity: 74, rainfall: 95,  risk: 71 },
  { month: "Jul", temp: 31, humidity: 82, rainfall: 185, risk: 78 },
  { month: "Aoû", temp: 30, humidity: 86, rainfall: 220, risk: 82 },
  { month: "Sep", temp: 31, humidity: 80, rainfall: 140, risk: 74 },
  { month: "Oct", temp: 32, humidity: 65, rainfall: 48,  risk: 58 },
  { month: "Nov", temp: 29, humidity: 50, rainfall: 8,   risk: 41 },
  { month: "Déc", temp: 26, humidity: 44, rainfall: 2,   risk: 33 },
];

const WEEKLY = [
  { day: "Lun", temp: 31.2, humidity: 78, rainfall: 12 },
  { day: "Mar", temp: 32.4, humidity: 74, rainfall: 0  },
  { day: "Mer", temp: 33.1, humidity: 71, rainfall: 0  },
  { day: "Jeu", temp: 31.8, humidity: 82, rainfall: 24 },
  { day: "Ven", temp: 30.5, humidity: 86, rainfall: 38 },
  { day: "Sam", temp: 29.8, humidity: 84, rainfall: 18 },
  { day: "Dim", temp: 31.4, humidity: 82, rainfall: 14 },
];

const tooltipStyle = {
  backgroundColor: "#0F172A", border: "none", borderRadius: "8px",
  padding: "8px 12px", color: "#F8FAFC", fontSize: "11px",
  fontFamily: "var(--font-family-mono)",
};

interface RegionRow {
  region:    string;
  temp:      number | null;
  humidity:  number | null;
  rainfall:  number | null;
  risk:      number;
  calcule_a: string;
}

function KpiCard({ label, value, unit, sub, color, bg, Icon, trendUp, trend }: {
  label: string; value: string | number; unit: string; sub: string;
  color: string; bg: string; Icon: ElementType;
  trendUp: boolean; trend: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="rounded-lg flex items-center justify-center" style={{ width: "36px", height: "36px", backgroundColor: bg }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex items-center gap-1">
          {trendUp ? <TrendingUp size={11} style={{ color: "#EF4444" }} /> : <TrendingDown size={11} style={{ color: "#22C55E" }} />}
          <span style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", fontWeight: 700, color: trendUp ? "#EF4444" : "#22C55E" }}>{trend}</span>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "26px", fontWeight: 800, color, lineHeight: 1 }}>
        {value}<span style={{ fontSize: "14px", fontWeight: 600, marginLeft: "2px" }}>{unit}</span>
      </div>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", marginTop: "4px" }}>{label}</div>
      <div style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "2px" }}>{sub}</div>
    </div>
  );
}

function fmt(v: number | null, suffix = ""): string {
  return v !== null ? `${v}${suffix}` : "—";
}

export function ClimateDataPage() {
  const [rows, setRows]           = useState<RegionRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [scores, zones] = await Promise.all([getRiskScores(), getZones()]);

      const zoneMap = new Map<string, ZoneResponse>(zones.map(z => [z.id, z]));

      // Latest score per region zone
      const latestByZone = new Map<string, RiskScoreResponse>();
      for (const s of scores) {
        const zone = zoneMap.get(s.zone_id);
        if (!zone || zone.niveau !== "region") continue;
        const prev = latestByZone.get(s.zone_id);
        if (!prev || new Date(s.calcule_a) > new Date(prev.calcule_a)) {
          latestByZone.set(s.zone_id, s);
        }
      }

      const regionRows: RegionRow[] = [];
      for (const [zoneId, score] of latestByZone.entries()) {
        const zone = zoneMap.get(zoneId)!;
        // Weather only exists for rule-based scores (facteurs.meteo.donnees)
        const meteo = (score.facteurs as Record<string, unknown> | null)?.meteo as Record<string, unknown> | undefined;
        const donnees = meteo?.donnees as Record<string, number> | undefined;
        regionRows.push({
          region:    zone.nom,
          temp:      donnees?.temperature ?? null,
          humidity:  donnees?.humidity    ?? null,
          rainfall:  donnees?.precipitation ?? null,
          risk:      Math.round(score.score * 100),
          calcule_a: score.calcule_a,
        });
      }

      regionRows.sort((a, b) => b.risk - a.risk);
      setRows(regionRows);

      if (regionRows.length > 0) {
        const mostRecent = regionRows.reduce((a, b) =>
          new Date(a.calcule_a) > new Date(b.calcule_a) ? a : b,
        );
        setLastUpdate(mostRecent.calcule_a);
      }
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }

  // KPI averages — only from regions that have weather data (rule-based scores)
  const withMeteo = rows.filter(r => r.temp !== null);
  const avgTemp     = withMeteo.length > 0
    ? (withMeteo.reduce((s, r) => s + r.temp!, 0) / withMeteo.length).toFixed(1)
    : "—";
  const avgHumidity = withMeteo.length > 0
    ? String(Math.round(withMeteo.reduce((s, r) => s + r.humidity!, 0) / withMeteo.length))
    : "—";
  const avgRain     = withMeteo.length > 0
    ? String(Math.round(withMeteo.reduce((s, r) => s + (r.rainfall ?? 0), 0) / withMeteo.length))
    : "—";

  const updateLabel = lastUpdate
    ? timeAgo(lastUpdate)
    : loading ? "Chargement…" : "Aucune donnée";

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5" style={{ fontFamily: "var(--font-family-base)", scrollbarWidth: "none" }}>

      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "16px", color: "var(--foreground)" }}>
            Données Climatiques
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
            Sénégal · {updateLabel}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold"
          style={{ color: "var(--muted-foreground)", cursor: loading ? "not-allowed" : "pointer" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Température moy." value={avgTemp}     unit="°C"   sub={withMeteo.length > 0 ? `${withMeteo.length} régions` : "Aucune donnée météo"} color="#D97706" bg="#FFF7ED" Icon={Thermometer} trendUp trend="Open-Meteo" />
        <KpiCard label="Humidité moy."    value={avgHumidity} unit="%"    sub={withMeteo.length > 0 ? "Moyenne nationale" : "Aucune donnée météo"}           color="#1A56DB" bg="#EFF6FF" Icon={Droplets}    trendUp trend="Open-Meteo" />
        <KpiCard label="Précipitations"   value={avgRain}     unit="mm"   sub={withMeteo.length > 0 ? "Moyenne par région" : "Aucune donnée météo"}          color="#0D9488" bg="#F0FDFA" Icon={CloudRain}   trendUp trend="Open-Meteo" />
        <KpiCard label="Scores actifs"    value={rows.length} unit=" rég" sub={lastUpdate ? `Calculé ${timeAgo(lastUpdate)}` : "En attente de calcul"}       color="#7C3AED" bg="#F5F3FF" Icon={Wind}        trendUp={false} trend="Temps réel" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Temperature & Humidity */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-5">
          <div className="mb-4">
            <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>
              Température & Humidité — 12 mois
            </h3>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>Moyennes saisonnières de référence · Sénégal</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={MONTHLY} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-family-mono)" }} />
              <Line type="monotone" dataKey="temp"     name="Temp (°C)"   stroke="#D97706" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="humidity" name="Humidité (%)" stroke="#1A56DB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rainfall */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-5">
          <div className="mb-4">
            <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>
              Précipitations — 12 mois
            </h3>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>Cumul mensuel de référence en mm</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MONTHLY} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="rainfall" name="Pluie (mm)" fill="#0D9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Weekly */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-5">
          <div className="mb-4">
            <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>
              Semaine en cours
            </h3>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>Temp · Humidité · Pluie · Référence saisonnière</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={WEEKLY} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-family-mono)" }} />
              <Bar dataKey="rainfall" name="Pluie (mm)"   fill="#0D9488" radius={[3, 3, 0, 0]} />
              <Bar dataKey="humidity" name="Humidité (%)" fill="#1A56DB" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Climat × Risque */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-5">
          <div className="mb-4">
            <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>
              Climat × Risque paludisme
            </h3>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>Corrélation annuelle de référence</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={MONTHLY} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="riskGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-family-mono)" }} />
              <Area type="monotone" dataKey="rainfall" name="Pluie (mm)" stroke="#0D9488" strokeWidth={2} fill="url(#rainGrad)" />
              <Area type="monotone" dataKey="risk"     name="Risque (%)" stroke="#EF4444" strokeWidth={2} fill="url(#riskGrad2)" strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>
            Données par région
          </h3>
          <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
            {rows.length > 0 ? `${rows.length} régions · Temps réel` : loading ? "Chargement…" : "Aucun score calculé"}
          </span>
        </div>

        {/* Header */}
        <div className="hidden sm:grid grid-cols-6 px-5 py-2" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--muted)" }}>
          {["Région", "Temp", "Humidité", "Pluies", "Indice risque", "Niveau"].map((h, i) => (
            <div key={i} style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {h}
            </div>
          ))}
        </div>

        {loading && rows.length === 0 && (
          <div className="px-5 py-8 text-center" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            Chargement des scores…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="px-5 py-8 text-center" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            Aucun score de risque disponible — lancez un calcul depuis la page Scores de risque.
          </div>
        )}

        {rows.map((r, i) => {
          const riskColor = r.risk >= 80 ? "#EF4444" : r.risk >= 60 ? "#F97316" : r.risk >= 40 ? "#EAB308" : "#22C55E";
          return (
            <div
              key={r.region}
              className="grid grid-cols-2 sm:grid-cols-6 px-4 sm:px-5 py-3 items-center gap-2 sm:gap-0"
              style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <MapPin size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{r.region}</span>
              </div>
              <div className="flex items-center gap-1">
                <Thermometer size={11} style={{ color: "#D97706" }} />
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: r.temp !== null ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {fmt(r.temp, "°C")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets size={11} style={{ color: "#1A56DB" }} />
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: r.humidity !== null ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {fmt(r.humidity, "%")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CloudRain size={11} style={{ color: "#0D9488" }} />
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: r.rainfall !== null ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {fmt(r.rainfall !== null ? Math.round(r.rainfall * 10) / 10 : null, "mm")}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full overflow-hidden flex-1 max-w-[80px]" style={{ height: "6px", backgroundColor: "var(--muted)" }}>
                    <div style={{ width: `${r.risk}%`, height: "100%", backgroundColor: riskColor, borderRadius: "999px" }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 700, color: riskColor }}>{r.risk}%</span>
                </div>
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{
                  backgroundColor: r.risk >= 80 ? "#FEF2F2" : r.risk >= 60 ? "#FFF7ED" : r.risk >= 40 ? "#FEFCE8" : "#F0FDF4",
                  color: riskColor,
                }}>
                  {r.risk >= 80 ? "Critique" : r.risk >= 60 ? "Élevé" : r.risk >= 40 ? "Moyen" : "Faible"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

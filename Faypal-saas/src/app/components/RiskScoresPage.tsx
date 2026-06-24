import { useState, useEffect } from "react";
import {
  MapPin, TrendingUp, TrendingDown, Shield,
  AlertTriangle, CheckCircle, Activity, RefreshCw, Loader,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  getRiskScores, getZones, triggerScoreCalc, timeAgo,
  type RiskScoreResponse, type ZoneResponse,
} from "../lib/api";

interface RegionRow {
  name: string;
  risk: number;
  trend: string;
  trendUp: boolean;
  temp: number;
  humidity: number;
  rainfall: number;
  mosquitoes: number;
  device: string;
  zoneId: string | null;
  lastCalc: string | null;
}

const STATIC_REGIONS: RegionRow[] = [
  { name: "Kédougou",    risk: 91, trend: "+12%", trendUp: true,  temp: 33.2, humidity: 86, rainfall: 220, mosquitoes: 134, device: "MB-01", zoneId: null, lastCalc: null },
  { name: "Tambacounda", risk: 85, trend: "+7%",  trendUp: true,  temp: 34.1, humidity: 77, rainfall: 185, mosquitoes: 112, device: "MB-03", zoneId: null, lastCalc: null },
  { name: "Kolda",       risk: 79, trend: "+3%",  trendUp: true,  temp: 31.4, humidity: 82, rainfall: 168, mosquitoes: 96,  device: "MB-05", zoneId: null, lastCalc: null },
  { name: "Kaffrine",    risk: 72, trend: "+6%",  trendUp: true,  temp: 33.5, humidity: 70, rainfall: 88,  mosquitoes: 71,  device: "—",     zoneId: null, lastCalc: null },
  { name: "Kaolack",     risk: 67, trend: "+4%",  trendUp: true,  temp: 32.3, humidity: 71, rainfall: 94,  mosquitoes: 63,  device: "MB-13", zoneId: null, lastCalc: null },
  { name: "Sédhiou",     risk: 68, trend: "+2%",  trendUp: true,  temp: 31.1, humidity: 75, rainfall: 110, mosquitoes: 57,  device: "—",     zoneId: null, lastCalc: null },
  { name: "Ziguinchor",  risk: 58, trend: "-1%",  trendUp: false, temp: 29.8, humidity: 80, rainfall: 132, mosquitoes: 44,  device: "—",     zoneId: null, lastCalc: null },
  { name: "Matam",       risk: 47, trend: "-2%",  trendUp: false, temp: 34.8, humidity: 52, rainfall: 48,  mosquitoes: 39,  device: "MB-09", zoneId: null, lastCalc: null },
  { name: "Fatick",      risk: 61, trend: "-3%",  trendUp: false, temp: 30.4, humidity: 69, rainfall: 78,  mosquitoes: 22,  device: "MB-14", zoneId: null, lastCalc: null },
  { name: "Diourbel",    risk: 54, trend: "+1%",  trendUp: true,  temp: 32.1, humidity: 60, rainfall: 62,  mosquitoes: 31,  device: "—",     zoneId: null, lastCalc: null },
  { name: "Thiès",       risk: 31, trend: "-18%", trendUp: false, temp: 28.1, humidity: 61, rainfall: 42,  mosquitoes: 22,  device: "MB-11", zoneId: null, lastCalc: null },
  { name: "Louga",       risk: 28, trend: "-4%",  trendUp: false, temp: 30.2, humidity: 48, rainfall: 22,  mosquitoes: 14,  device: "—",     zoneId: null, lastCalc: null },
  { name: "Dakar",       risk: 22, trend: "-6%",  trendUp: false, temp: 27.4, humidity: 58, rainfall: 28,  mosquitoes: 8,   device: "—",     zoneId: null, lastCalc: null },
  { name: "Saint-Louis", risk: 19, trend: "-8%",  trendUp: false, temp: 28.3, humidity: 44, rainfall: 14,  mosquitoes: 6,   device: "—",     zoneId: null, lastCalc: null },
];

type Level = "all" | "critique" | "élevé" | "moyen" | "faible";

function getLevel(risk: number): { label: string; color: string; bg: string; border: string; level: Level } {
  if (risk >= 80) return { label: "Critique", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", level: "critique" };
  if (risk >= 60) return { label: "Élevé",    color: "#F97316", bg: "#FFF7ED", border: "#FED7AA", level: "élevé" };
  if (risk >= 40) return { label: "Moyen",    color: "#EAB308", bg: "#FEFCE8", border: "#FEF08A", level: "moyen" };
  return               { label: "Faible",    color: "#22C55E", bg: "#F0FDF4", border: "#BBF7D0", level: "faible" };
}

const tooltipStyle = {
  backgroundColor: "#0F172A", border: "none", borderRadius: "8px",
  padding: "8px 12px", color: "#F8FAFC", fontSize: "11px",
  fontFamily: "var(--font-family-mono)",
};

function mergeApiData(zones: ZoneResponse[], scores: RiskScoreResponse[]): RegionRow[] {
  const regionZones = new Map<string, string>();
  zones.filter(z => z.niveau === "region").forEach(z => regionZones.set(z.nom, z.id));

  const latestByZone = new Map<string, RiskScoreResponse>();
  scores.forEach(s => {
    const ex = latestByZone.get(s.zone_id);
    if (!ex || s.calcule_a > ex.calcule_a) latestByZone.set(s.zone_id, s);
  });

  return STATIC_REGIONS.map(r => {
    const zoneId = regionZones.get(r.name) ?? null;
    if (!zoneId) return { ...r, zoneId: null, lastCalc: null };
    const score = latestByZone.get(zoneId);
    if (!score) return { ...r, zoneId, lastCalc: null };

    const realRisk = Math.round(score.score * 100);
    const meteo = (score.facteurs as Record<string, unknown> | null)?.meteo as Record<string, unknown> | undefined;
    const donnees = meteo?.donnees as Record<string, number> | undefined;
    const moustiques = (score.facteurs as Record<string, unknown> | null)?.moustiques as Record<string, unknown> | undefined;
    const nbVecteurs = (moustiques?.nb_vecteurs_24h as number | undefined) ?? r.mosquitoes;

    return {
      ...r,
      risk:       realRisk,
      temp:       donnees?.temperature ?? r.temp,
      humidity:   donnees?.humidity    ?? r.humidity,
      rainfall:   donnees?.precipitation ?? r.rainfall,
      mosquitoes: nbVecteurs,
      zoneId,
      lastCalc:   score.calcule_a,
    };
  });
}

interface RiskScoresPageProps {
  userRole?: string;
}

export function RiskScoresPage({ userRole }: RiskScoresPageProps) {
  const [filter, setFilter]   = useState<Level>("all");
  const [sort, setSort]       = useState<"risk" | "name">("risk");
  const [regions, setRegions] = useState<RegionRow[]>(STATIC_REGIONS);
  const [loading, setLoading] = useState(true);
  const [calcLoading, setCalcLoading] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const canCalc = userRole === "admin" || userRole === "epidemiologist";

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [scores, zones] = await Promise.all([getRiskScores(), getZones()]);
      setRegions(mergeApiData(zones, scores));
      setLastRefresh(new Date());
    } catch {
      // backend indisponible — données statiques
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleCalc = async (zoneId: string, name: string) => {
    setCalcLoading(zoneId);
    try {
      await triggerScoreCalc(zoneId);
      await loadData(true);
    } catch (e: unknown) {
      alert(`Erreur calcul ${name}: ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setCalcLoading(null);
    }
  };

  const filtered = regions
    .filter(r => filter === "all" || getLevel(r.risk).level === filter)
    .sort((a, b) => sort === "risk" ? b.risk - a.risk : a.name.localeCompare(b.name));

  const counts = {
    critique: regions.filter(r => r.risk >= 80).length,
    élevé:    regions.filter(r => r.risk >= 60 && r.risk < 80).length,
    moyen:    regions.filter(r => r.risk >= 40 && r.risk < 60).length,
    faible:   regions.filter(r => r.risk < 40).length,
  };

  const chartData = [...regions].sort((a, b) => b.risk - a.risk);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5" style={{ fontFamily: "var(--font-family-base)", scrollbarWidth: "none" }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "16px", color: "var(--foreground)" }}>
            Scores de risque
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
            {regions.length} régions analysées · Mis à jour {timeAgo(lastRefresh.toISOString())} · Sénégal
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
        >
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Rafraîchir
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {([
          { level: "critique" as Level, label: "Critique", count: counts.critique, color: "#EF4444", bg: "#FEF2F2", Icon: AlertTriangle },
          { level: "élevé"   as Level, label: "Élevé",    count: counts.élevé,    color: "#F97316", bg: "#FFF7ED", Icon: Activity },
          { level: "moyen"   as Level, label: "Moyen",    count: counts.moyen,    color: "#EAB308", bg: "#FEFCE8", Icon: Shield },
          { level: "faible"  as Level, label: "Faible",   count: counts.faible,   color: "#22C55E", bg: "#F0FDF4", Icon: CheckCircle },
        ]).map(({ level, label, count, color, bg, Icon }) => (
          <button
            key={level}
            onClick={() => setFilter(filter === level ? "all" : level)}
            className="rounded-xl p-3 sm:p-4 border flex items-center gap-3 cursor-pointer transition-all text-left"
            style={{
              backgroundColor: filter === level ? bg : "var(--card)",
              borderColor: filter === level ? color + "80" : "var(--border)",
              boxShadow: filter === level ? `0 0 0 2px ${color}20` : "none",
            }}
          >
            <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: "36px", height: "36px", backgroundColor: bg }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "22px", fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px", fontWeight: 600 }}>{label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-5 mb-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>
              Score de risque par région
            </h3>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>Classement décroissant · Sénégal</p>
          </div>
          <span className="px-2 py-1 rounded-md text-xs font-bold" style={{ backgroundColor: "#FEF2F2", color: "#EF4444", fontFamily: "var(--font-family-mono)" }}>
            Moy. {Math.round(regions.reduce((s, r) => s + r.risk, 0) / regions.length)}%
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }}
              axisLine={false} tickLine={false}
              angle={-40} textAnchor="end" interval={0}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Risque"]} />
            <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
              {chartData.map((r) => (
                <Cell key={r.name} fill={getLevel(r.risk).color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters + sort */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "critique", "élevé", "moyen", "faible"] as Level[]).map(f => {
            const cfg = f !== "all" ? getLevel(f === "critique" ? 91 : f === "élevé" ? 67 : f === "moyen" ? 50 : 22) : null;
            const count = f === "all" ? regions.length : regions.filter(r => getLevel(r.risk).level === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                style={{
                  backgroundColor: filter === f ? (cfg?.color ?? "#1A56DB") : "var(--input-background)",
                  color: filter === f ? "#fff" : "var(--muted-foreground)",
                  border: `1px solid ${filter === f ? (cfg?.color ?? "#1A56DB") : "var(--border)"}`,
                }}
              >
                {f === "all" ? `Toutes (${count})` : `${cfg!.label} (${count})`}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Trier par :</span>
          {(["risk", "name"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: sort === s ? "#1A56DB" : "var(--input-background)",
                color: sort === s ? "#fff" : "var(--muted-foreground)",
                border: `1px solid ${sort === s ? "#1A56DB" : "var(--border)"}`,
              }}
            >
              {s === "risk" ? "Score" : "Région"}
            </button>
          ))}
        </div>
      </div>

      {/* Regions table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-12 px-4 sm:px-5 py-2.5" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--muted)" }}>
          {["Région", "Score", "Tendance", "Temp.", "Humidité", "Pluies", "Moustiques", "Capteur", "Niveau", ""].map((h, i) => (
            <div
              key={h + i}
              className={i === 0 ? "col-span-2" : i === 8 ? "col-span-2" : i === 9 ? "col-span-1" : "col-span-1"}
              style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((r, idx) => {
          const lvl = getLevel(r.risk);
          const isCalcing = calcLoading === r.zoneId;
          return (
            <div
              key={r.name}
              className="grid grid-cols-2 sm:grid-cols-12 items-center px-4 sm:px-5 py-3 gap-3 sm:gap-0"
              style={{
                borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
                backgroundColor: r.risk >= 80 ? "rgba(239,68,68,0.02)" : "transparent",
              }}
            >
              {/* Region */}
              <div className="col-span-2 sm:col-span-2 flex items-center gap-2 min-w-0">
                <MapPin size={11} style={{ color: lvl.color, flexShrink: 0 }} />
                <div className="min-w-0">
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }} className="truncate block">{r.name}</span>
                  {r.lastCalc && (
                    <span style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>{timeAgo(r.lastCalc)}</span>
                  )}
                </div>
              </div>

              {/* Score bar */}
              <div className="sm:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-full overflow-hidden hidden sm:block" style={{ width: "40px", height: "5px", backgroundColor: "var(--muted)" }}>
                    <div style={{ width: `${r.risk}%`, height: "100%", backgroundColor: lvl.color, borderRadius: "999px" }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "13px", fontWeight: 800, color: lvl.color }}>{r.risk}%</span>
                </div>
              </div>

              {/* Trend */}
              <div className="sm:col-span-1 flex items-center gap-1">
                {r.trendUp
                  ? <TrendingUp size={10} style={{ color: "#EF4444" }} />
                  : <TrendingDown size={10} style={{ color: "#22C55E" }} />}
                <span style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", fontWeight: 700, color: r.trendUp ? "#EF4444" : "#22C55E" }}>
                  {r.trend}
                </span>
              </div>

              {/* Temp */}
              <div className="sm:col-span-1 hidden sm:block">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>{r.temp}°C</span>
              </div>

              {/* Humidity */}
              <div className="sm:col-span-1 hidden sm:block">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>{r.humidity}%</span>
              </div>

              {/* Rainfall */}
              <div className="sm:col-span-1 hidden sm:block">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>{r.rainfall}mm</span>
              </div>

              {/* Mosquitoes */}
              <div className="sm:col-span-1 hidden sm:block">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 700, color: "#0D9488" }}>{r.mosquitoes}</span>
              </div>

              {/* Device */}
              <div className="sm:col-span-1 hidden sm:block">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "11px", color: r.device === "—" ? "var(--muted-foreground)" : "#1A56DB", fontWeight: 600 }}>
                  {r.device}
                </span>
              </div>

              {/* Level badge */}
              <div className="sm:col-span-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: lvl.bg, color: lvl.color, border: `1px solid ${lvl.border}` }}>
                  {lvl.label}
                </span>
              </div>

              {/* Calculer button */}
              <div className="sm:col-span-1 hidden sm:flex justify-end">
                {canCalc && r.zoneId && (
                  <button
                    onClick={() => handleCalc(r.zoneId!, r.name)}
                    disabled={isCalcing}
                    title="Recalculer le score"
                    className="flex items-center justify-center rounded-lg cursor-pointer"
                    style={{ width: "28px", height: "28px", backgroundColor: "var(--input-background)", border: "1px solid var(--border)" }}
                  >
                    {isCalcing
                      ? <Loader size={11} style={{ color: "#1A56DB", animation: "spin 1s linear infinite" }} />
                      : <RefreshCw size={11} style={{ color: "var(--muted-foreground)" }} />
                    }
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

/** @jsxRuntime classic */
import React, { useState, useEffect, useRef } from "react";
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
  getMLPrediction, getMLPredictionV2, isoWeek,
  type RiskScoreResponse, type ZoneResponse, type MLPrediction, type MLPredictionV2,
} from "../lib/api";

interface RegionRow {
  name: string;
  risk: number;
  trend: string;
  trendUp: boolean;
  temp:       number | null;
  humidity:   number | null;
  rainfall:   number | null;
  mosquitoes: number | null;
  device: string;
  zoneId: string | null;
  lastCalc: string | null;
  horizons?: Record<string, unknown> | null;
  version_algo?: string | null;
}

const STATIC_REGIONS: RegionRow[] = [
  { name: "Kédougou",    risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Tambacounda", risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Kolda",       risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Kaffrine",    risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Kaolack",     risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Sédhiou",     risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Ziguinchor",  risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Matam",       risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Fatick",      risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Diourbel",    risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Thiès",       risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Louga",       risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Dakar",       risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
  { name: "Saint-Louis", risk: 0, trend: "—", trendUp: false, temp: null, humidity: null, rainfall: null, mosquitoes: null, device: "—", zoneId: null, lastCalc: null },
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

  // Grouper tous les scores par zone (déjà triés desc par l'API)
  const scoresByZone = new Map<string, RiskScoreResponse[]>();
  scores.forEach(s => {
    const list = scoresByZone.get(s.zone_id) ?? [];
    list.push(s);
    scoresByZone.set(s.zone_id, list);
  });

  return STATIC_REGIONS.map(r => {
    const zoneId = regionZones.get(r.name) ?? null;
    if (!zoneId) return { ...r, zoneId: null, lastCalc: null };

    const list = scoresByZone.get(zoneId) ?? [];
    if (list.length === 0) return { ...r, zoneId, lastCalc: null };

    const current  = list[0];
    const previous = list[1] ?? null;

    const realRisk = Math.round(current.score * 100);

    // Tendance calculée depuis les 2 derniers scores réels
    let trend   = r.trend;
    let trendUp = r.trendUp;
    if (previous) {
      const diff = ((current.score - previous.score) / Math.max(previous.score, 0.01)) * 100;
      trend   = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
      trendUp = diff > 0;
    }

    const facteurs   = current.facteurs as Record<string, unknown> | null;
    const meteo      = facteurs?.meteo as Record<string, unknown> | undefined;
    const donnees    = meteo?.donnees as Record<string, number> | undefined;
    const moustiques = facteurs?.moustiques as Record<string, unknown> | undefined;
    // Ne montrer que des valeurs réelles — null = pas de capteur / pas de scoring rule-based
    const nbVecteurs = (moustiques?.nb_vecteurs_24h as number | undefined) ?? null;
    const horizons   = facteurs?.horizons as Record<string, unknown> | null ?? null;

    return {
      ...r,
      risk:         realRisk,
      trend,
      trendUp,
      temp:         donnees?.temperature    ?? null,
      humidity:     donnees?.humidity       ?? null,
      rainfall:     donnees?.precipitation  ?? null,
      mosquitoes:   nbVecteurs,
      zoneId,
      lastCalc:     current.calcule_a,
      horizons,
      version_algo: current.version_algo,
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
  const [selected, setSelected] = useState<RegionRow | null>(null);
  const [mlPred, setMlPred] = useState<MLPrediction | null>(null);
  const [mlPredV2, setMlPredV2] = useState<MLPredictionV2 | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);

  const canCalc = userRole === "admin" || userRole === "analyste";
  const activeRegionRef = useRef<string | null>(null);

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

  const handleSelect = (r: RegionRow) => {
    activeRegionRef.current = r.name;
    setSelected(r);
    setMlPred(null);
    setMlPredV2(null);
    setMlError(null);
    setMlLoading(true);
    const week = isoWeek();
    const year = new Date().getFullYear();
    Promise.all([
      getMLPrediction(r.name, week, year),
      getMLPredictionV2(r.name, week, year),
    ])
      .then(([pred, predV2]) => {
        if (activeRegionRef.current !== r.name) return;
        setMlPred(pred);
        setMlPredV2(predV2);
      })
      .catch((err: unknown) => {
        if (activeRegionRef.current !== r.name) return;
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        setMlError(msg);
      })
      .finally(() => {
        if (activeRegionRef.current !== r.name) return;
        setMlLoading(false);
      });
  };

  const handleRefresh = async () => {
    if (canCalc) {
      // Recalcule tous les scores en parallèle, puis recharge
      setLoading(true);
      const zoneIds = regions.filter(r => r.zoneId).map(r => r.zoneId as string);
      await Promise.allSettled(zoneIds.map(id => triggerScoreCalc(id)));
      await loadData(true);
    } else {
      await loadData(true);
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
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
        >
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {canCalc ? "Recalculer tout" : "Rafraîchir"}
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
              onClick={() => handleSelect(r)}
              className="grid grid-cols-2 sm:grid-cols-12 items-center px-4 sm:px-5 py-3 gap-3 sm:gap-0 cursor-pointer"
              style={{
                borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
                backgroundColor: selected?.name === r.name ? "rgba(26,86,219,0.04)" : r.risk >= 80 ? "rgba(239,68,68,0.02)" : "transparent",
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
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: r.temp !== null ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {r.temp !== null ? `${r.temp}°C` : "—"}
                </span>
              </div>

              {/* Humidity */}
              <div className="sm:col-span-1 hidden sm:block">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: r.humidity !== null ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {r.humidity !== null ? `${r.humidity}%` : "—"}
                </span>
              </div>

              {/* Rainfall */}
              <div className="sm:col-span-1 hidden sm:block">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 600, color: r.rainfall !== null ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {r.rainfall !== null ? `${r.rainfall}mm` : "—"}
                </span>
              </div>

              {/* Mosquitoes */}
              <div className="sm:col-span-1 hidden sm:block">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 700, color: r.mosquitoes !== null ? "#0D9488" : "var(--muted-foreground)" }}>
                  {r.mosquitoes !== null ? r.mosquitoes : "—"}
                </span>
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
                    onClick={(e) => { e.stopPropagation(); handleCalc(r.zoneId!, r.name); }}
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

      {/* ── Panneau détail prédictions ML ─────────────────────────── */}
      {selected && (
        <div className="fixed bottom-4 right-4 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4"
          style={{ fontFamily: "var(--font-family-base)" }}>

          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                {selected.name}
              </h3>
              <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                Score actuel · {selected.risk}% · {selected.lastCalc ? timeAgo(selected.lastCalc) : "données statiques"}
              </p>
            </div>
            <button onClick={() => { setSelected(null); setMlPred(null); setMlPredV2(null); setMlError(null); }}
              style={{ color: "var(--muted-foreground)", fontSize: "16px", lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>
              ✕
            </button>
          </div>

          {/* Prédictions ML */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              Prédictions ML
              {mlLoading && <span style={{ display: "inline-block", width: "10px", height: "10px", border: "1.5px solid #94A3B8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}
            </p>

            {mlPred ? (
              <>
                {(["S+1", "S+4", "S+12"] as const).map(h => {
                  const hz = (mlPred.horizons as Record<string, unknown>)[h] as Record<string, unknown> | undefined;
                  if (!hz) return null;
                  const niv = (hz.niveau_risque as string ?? "FAIBLE").toUpperCase();
                  const cas = hz.cas_predits as number ?? 0;
                  const isPic = mlPred.pic_attendu === h;
                  const nivColor = niv === "CRITIQUE" ? "#EF4444" : niv === "ELEVE" ? "#F97316" : niv === "MODERE" ? "#EAB308" : "#22C55E";
                  const intervalle = hz.intervalle as { min: number; max: number } | undefined;
                  return (
                    <div key={h} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "11px", color: "var(--muted-foreground)", width: "36px" }}>{h}</span>
                        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 700, color: "var(--foreground)" }}>{cas.toLocaleString()} cas</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "999px", color: nivColor, background: `${nivColor}18` }}>
                          {niv}{isPic ? " ★" : ""}
                        </span>
                      </div>
                      {intervalle && (
                        <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "9px", color: "var(--muted-foreground)", marginTop: "2px", paddingLeft: "36px" }}>
                          [{intervalle.min.toLocaleString()} – {intervalle.max.toLocaleString()}]
                        </div>
                      )}
                    </div>
                  );
                })}
                {mlPred.tendance_4sem && (
                  <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "8px" }}>
                    Tendance : {mlPred.tendance_4sem === "hausse" ? "↗ hausse" : mlPred.tendance_4sem === "baisse" ? "↘ baisse" : "→ stable"}
                  </p>
                )}

                {mlPredV2 && (
                  <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>
                      Analyse enrichie (v2)
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                      {[
                        ["Couverture MILDA", `${mlPredV2.attributs_utilises.couverture_milda_pct}%`],
                        ["CPS", `${mlPredV2.attributs_utilises.cps_couverture_pct}%`],
                        ["Positivité TDR", `${mlPredV2.attributs_utilises.taux_positivite_tdr}%`],
                        ["Densité", `${mlPredV2.attributs_utilises.densite_km2} /km²`],
                        ["Altitude", `${mlPredV2.attributs_utilises.altitude_m} m`],
                        ["Strate", mlPredV2.strate],
                      ].map(([label, value]) => (
                        <div key={label} style={{ background: "var(--muted)", borderRadius: "6px", padding: "4px 6px" }}>
                          <div style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>{label}</div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground)" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : !mlLoading && (
              <p style={{ fontSize: "11px", color: mlError ? "#EF4444" : "var(--muted-foreground)" }}>
                {mlError ? `Erreur : ${mlError}` : "Prédictions indisponibles"}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

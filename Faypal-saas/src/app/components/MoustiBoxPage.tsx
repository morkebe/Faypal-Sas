import { useState } from "react";
import {
  Cpu, Battery, Wifi, Thermometer, Droplets,
  Bug, CheckCircle, AlertTriangle, XCircle, RefreshCw,
  MapPin, Clock, TrendingUp, TrendingDown,
  Plus, Download, Settings, X, Menu, Bell,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const DEVICES = [
  {
    id: "MB-01", location: "Kédougou", region: "Kédougou", lat: "12.55°N", lng: "12.18°W",
    status: "active", battery: 87, signal: 3, temp: 33.2, humidity: 86, lastTx: "Il y a 2 min",
    mosquitoes: 134, anopheles: 91, culex: 31, aedes: 12, healthScore: 96,
    uptime: "99.8%", firmware: "v2.4.1", deployedDays: 142,
    hourly: [12, 18, 22, 31, 28, 41, 55, 67, 72, 80, 89, 94, 101, 112, 128, 134, 119, 98, 74, 51, 38, 27, 18, 14],
  },
  {
    id: "MB-03", location: "Tambacounda", region: "Tambacounda", lat: "13.77°N", lng: "13.68°W",
    status: "active", battery: 62, signal: 2, temp: 34.1, humidity: 77, lastTx: "Il y a 5 min",
    mosquitoes: 112, anopheles: 78, culex: 24, aedes: 10, healthScore: 91,
    uptime: "98.2%", firmware: "v2.4.1", deployedDays: 118,
    hourly: [9, 14, 18, 24, 21, 33, 44, 58, 61, 70, 78, 83, 90, 98, 108, 112, 105, 88, 64, 45, 31, 22, 14, 10],
  },
  {
    id: "MB-05", location: "Kolda", region: "Kolda", lat: "12.88°N", lng: "14.94°W",
    status: "active", battery: 91, signal: 3, temp: 31.4, humidity: 82, lastTx: "Il y a 1 min",
    mosquitoes: 96, anopheles: 67, culex: 19, aedes: 10, healthScore: 98,
    uptime: "99.9%", firmware: "v2.4.1", deployedDays: 207,
    hourly: [7, 11, 15, 20, 17, 28, 37, 49, 54, 62, 70, 75, 81, 88, 93, 96, 89, 74, 55, 38, 26, 18, 12, 8],
  },
  {
    id: "MB-07", location: "Salémata", region: "Kédougou", lat: "12.63°N", lng: "12.77°W",
    status: "active", battery: 74, signal: 2, temp: 30.8, humidity: 84, lastTx: "Il y a 8 min",
    mosquitoes: 88, anopheles: 61, culex: 18, aedes: 9, healthScore: 88,
    uptime: "97.1%", firmware: "v2.3.8", deployedDays: 94,
    hourly: [6, 9, 13, 17, 14, 23, 31, 42, 46, 54, 61, 66, 72, 78, 83, 88, 81, 67, 50, 34, 23, 16, 10, 7],
  },
  {
    id: "MB-09", location: "Matam", region: "Matam", lat: "15.66°N", lng: "13.26°W",
    status: "warning", battery: 34, signal: 1, temp: 34.8, humidity: 52, lastTx: "Il y a 12 min",
    mosquitoes: 39, anopheles: 27, culex: 9, aedes: 3, healthScore: 61,
    uptime: "94.4%", firmware: "v2.3.8", deployedDays: 61,
    hourly: [3, 5, 7, 9, 8, 12, 16, 21, 24, 28, 32, 35, 37, 39, 38, 36, 34, 30, 24, 18, 13, 9, 6, 4],
  },
  {
    id: "MB-11", location: "Thiès", region: "Thiès", lat: "14.79°N", lng: "16.93°W",
    status: "active", battery: 78, signal: 3, temp: 28.1, humidity: 61, lastTx: "Il y a 3 min",
    mosquitoes: 22, anopheles: 14, culex: 6, aedes: 2, healthScore: 94,
    uptime: "99.5%", firmware: "v2.4.1", deployedDays: 183,
    hourly: [2, 3, 4, 5, 4, 7, 9, 11, 12, 14, 16, 18, 19, 21, 22, 21, 20, 18, 15, 11, 8, 6, 4, 3],
  },
  {
    id: "MB-13", location: "Kaolack", region: "Kaolack", lat: "14.15°N", lng: "16.07°W",
    status: "active", battery: 55, signal: 2, temp: 32.3, humidity: 71, lastTx: "Il y a 7 min",
    mosquitoes: 63, anopheles: 44, culex: 14, aedes: 5, healthScore: 85,
    uptime: "96.8%", firmware: "v2.4.1", deployedDays: 77,
    hourly: [5, 7, 9, 12, 10, 16, 22, 30, 33, 39, 45, 50, 55, 59, 62, 63, 59, 52, 41, 30, 21, 14, 9, 6],
  },
  {
    id: "MB-14", location: "Fatick", region: "Fatick", lat: "14.34°N", lng: "16.41°W",
    status: "offline", battery: 0, signal: 0, temp: null, humidity: null, lastTx: "Il y a 6h",
    mosquitoes: 0, anopheles: 0, culex: 0, aedes: 0, healthScore: 0,
    uptime: "72.1%", firmware: "v2.3.5", deployedDays: 38,
    hourly: Array(24).fill(0),
  },
];

const statusConfig = {
  active:  { color: "#16A34A", bg: "rgba(22,163,74,0.13)",  border: "rgba(22,163,74,0.3)",  label: "Actif",      Icon: CheckCircle  },
  warning: { color: "#D97706", bg: "rgba(217,119,6,0.13)",  border: "rgba(217,119,6,0.3)",  label: "Alerte",     Icon: AlertTriangle },
  offline: { color: "#EF4444", bg: "rgba(239,68,68,0.13)",  border: "rgba(239,68,68,0.3)",  label: "Hors-ligne", Icon: XCircle      },
};

const tooltipStyle = {
  backgroundColor: "#0F172A", border: "none", borderRadius: "8px",
  padding: "8px 12px", color: "#F8FAFC", fontSize: "11px",
  fontFamily: "var(--font-family-mono)",
};

function BatteryBar({ level }: { level: number }) {
  const color = level > 60 ? "#16A34A" : level > 30 ? "#D97706" : level > 0 ? "#EF4444" : "#CBD5E1";
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-sm overflow-hidden" style={{ width: "36px", height: "8px", backgroundColor: "var(--muted)", position: "relative" }}>
        <div style={{ width: `${level}%`, height: "100%", backgroundColor: color, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", fontWeight: 600, color }}>{level > 0 ? `${level}%` : "—"}</span>
    </div>
  );
}

function SignalBars({ level }: { level: number }) {
  return (
    <div className="flex items-end gap-0.5">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-sm" style={{ width: "5px", height: `${6 + i * 4}px`, backgroundColor: i <= level ? "#1A56DB" : "#E2E8F0" }} />
      ))}
    </div>
  );
}

function HealthScoreRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score > 80 ? "#16A34A" : score > 50 ? "#D97706" : "#EF4444";
  return (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r={r} fill="none" stroke="#E2E8F0" strokeWidth="5" />
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 30 30)" style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text x="30" y="34" textAnchor="middle" style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", fontWeight: 700, fill: color }}>
        {score > 0 ? score : "—"}
      </text>
    </svg>
  );
}

export function MoustiBoxPage() {
  const [selected, setSelected] = useState<typeof DEVICES[0] | null>(DEVICES[0]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "warning" | "offline">("all");
  const [showDeviceList, setShowDeviceList] = useState(true);

  const filtered = DEVICES.filter(d => statusFilter === "all" || d.status === statusFilter);
  const activeCount = DEVICES.filter(d => d.status === "active").length;
  const warningCount = DEVICES.filter(d => d.status === "warning").length;
  const offlineCount = DEVICES.filter(d => d.status === "offline").length;
  const totalMosq = DEVICES.reduce((s, d) => s + d.mosquitoes, 0);

  return (
    <div className="flex flex-col h-full w-full" style={{ fontFamily: "var(--font-family-base)" }}>

      {/* Header - RESPONSIVE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-6 py-3 shrink-0 gap-3"
        style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex-1">
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }} className="sm:text-base">
            Gestion de la flotte MoustiBox
          </h2>
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "1px" }} className="sm:text-sm">
            Surveillance vectorielle IA · Déploiement Sénégal
          </p>
        </div>

        {/* Mobile toggle button */}
        <button
          onClick={() => setShowDeviceList(!showDeviceList)}
          className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ fontSize: "12px", fontWeight: 600, cursor: "pointer", backgroundColor: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          {showDeviceList ? <X size={14} /> : <Menu size={14} />}
          {showDeviceList ? "Masquer" : "Afficher"} les appareils
        </button>

        {/* Header buttons - Hidden on mobile, visible on sm+ */}
        <div className="hidden sm:flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm" style={{ fontWeight: 600, cursor: "pointer", backgroundColor: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
            <Download size={13} /> <span className="hidden md:inline">Exporter</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm" style={{ fontWeight: 600, cursor: "pointer", backgroundColor: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
            <RefreshCw size={13} /> <span className="hidden md:inline">Sync</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm" style={{ fontWeight: 600, cursor: "pointer", backgroundColor: "#1A56DB", color: "#fff", border: "none" }}>
            <Plus size={13} /> <span className="hidden md:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* ★ Fleet KPIs - MINIMALISTE CLEAN ★ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 shrink-0 overflow-x-auto"
        style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        {[
          {
            label: "Total MoustiBox",
            value: String(DEVICES.length),
            trend: "Sénégal",
            trendUp: true,
            icon: Cpu,
            sub: "Capteurs",
            alert: false,
          },
          {
            label: "Actifs",
            value: String(activeCount),
            trend: "90% disponible",
            trendUp: true,
            icon: CheckCircle,
            sub: "Transmis",
            alert: false,
          },
          {
            label: "Alertes",
            value: String(warningCount),
            trend: "Attention",
            trendUp: true,
            icon: AlertTriangle,
            sub: "Signal faible",
            alert: true,
          },
          {
            label: "Hors-ligne",
            value: String(offlineCount),
            trend: "Maintenance",
            trendUp: false,
            icon: XCircle,
            sub: "Batterie",
            alert: true,
          },
          {
            label: "Moustiques",
            value: String(totalMosq),
            trend: "+134",
            trendUp: true,
            icon: Bug,
            sub: "24h",
            alert: false,
          },
          {
            label: "Zones",
            value: "6",
            trend: "+1",
            trendUp: true,
            icon: Bell,
            sub: "Critiques",
            alert: true,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg p-3 sm:p-4 relative overflow-hidden flex-shrink-0 min-w-[160px] sm:min-w-0 transition-all duration-200"
              style={{
                background: "var(--card)",
                border: `1px solid var(--border)`,
              }}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: "var(--muted-foreground)" }} />
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {card.label}
                  </span>
                </div>

                <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "20px", fontWeight: 800, color: "var(--foreground)", lineHeight: 1, marginBottom: "4px" }}>
                  {card.value}
                </div>

                <div style={{ fontSize: "10px", color: "var(--muted-foreground)", marginBottom: "6px" }}>
                  {card.sub}
                </div>

                <div className="flex items-center gap-1 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  {card.trendUp
                    ? <TrendingUp size={10} style={{ color: "var(--muted-foreground)" }} />
                    : <TrendingDown size={10} style={{ color: "#EF4444" }} />}
                  <span style={{ fontSize: "9px", fontFamily: "var(--font-family-mono)", color: "var(--muted-foreground)", fontWeight: 600 }}>
                    {card.trend}
                  </span>
                </div>
              </div>

              {card.alert && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#EF4444" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Main content - RESPONSIVE LAYOUT */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* Device list - Mobile Modal / Desktop Sidebar */}
        {(showDeviceList || window.innerWidth >= 1024) && (
          <div className={`${window.innerWidth < 1024 ? "absolute lg:static inset-0 z-40 lg:z-auto" : ""} shrink-0 flex flex-col lg:w-80 bg-card border-r border-border overflow-hidden`}>
            {/* Filter - RESPONSIVE */}
            <div className="px-3 py-3 flex items-center gap-1.5 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
              {(["all", "active", "warning", "offline"] as const).map(f => {
                const cfg = f === "all" ? null : statusConfig[f];
                return (
                  <button
                    key={f}
                    onClick={() => {
                      setStatusFilter(f);
                      if (window.innerWidth < 1024) setShowDeviceList(false);
                    }}
                    className="px-2 sm:px-2.5 py-1 rounded-lg capitalize text-xs transition-all"
                    style={{
                      fontWeight: 600, cursor: "pointer",
                      backgroundColor: statusFilter === f ? (cfg?.color ?? "#1A56DB") : "var(--input-background)",
                      color: statusFilter === f ? "#fff" : "var(--muted-foreground)",
                      border: "1px solid",
                      borderColor: statusFilter === f ? (cfg?.color ?? "#1A56DB") : "var(--border)",
                    }}
                  >
                    <span className="hidden sm:inline">{f === "all" ? `Tout (${DEVICES.length})` : `${f === "active" ? "Actif" : f === "warning" ? "Alerte" : "Hors-ligne"} (${DEVICES.filter(d => d.status === f).length})`}</span>
                    <span className="sm:hidden">{f === "all" ? "Tout" : f === "active" ? "✓" : f === "warning" ? "!" : "✕"}</span>
                  </button>
                );
              })}
            </div>

            {/* Device list - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {filtered.map(device => {
                const cfg = statusConfig[device.status as keyof typeof statusConfig];
                const isSelected = selected?.id === device.id;
                return (
                  <div
                    key={device.id}
                    onClick={() => {
                      setSelected(device);
                      if (window.innerWidth < 1024) setShowDeviceList(false);
                    }}
                    className="px-3 sm:px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: isSelected ? "#EFF6FF" : "transparent",
                      borderLeft: isSelected ? "3px solid #1A56DB" : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F8FAFC"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: "28px", height: "28px", backgroundColor: cfg.bg }}>
                          <cfg.Icon size={13} style={{ color: cfg.color }} />
                        </div>
                        <div className="min-w-0">
                          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 700, color: "var(--foreground)", display: "block", overflow: "hidden", textOverflow: "ellipsis" }} className="sm:text-sm">{device.id}</span>
                          <div className="flex items-center gap-1">
                            <MapPin size={8} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                            <span style={{ fontSize: "10px", color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis" }} className="sm:text-xs">{device.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <SignalBars level={device.signal} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <BatteryBar level={device.battery} />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Bug size={10} style={{ color: "#0D9488" }} />
                        <span style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", fontWeight: 700, color: "#0D9488" }}>
                          {device.mosquitoes > 0 ? device.mosquitoes : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overlay for mobile */}
        {showDeviceList && window.innerWidth < 1024 && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setShowDeviceList(false)}
          />
        )}

        {/* Device detail - RESPONSIVE */}
        {selected ? (
          <div className="flex-1 overflow-y-auto bg-background px-3 sm:px-6 py-4 sm:py-6" style={{ scrollbarWidth: "thin" }}>
            {(() => {
              const cfg = statusConfig[selected.status as keyof typeof statusConfig];
              const hours = Array.from({ length: 24 }, (_, i) => ({
                h: `${String(i).padStart(2, "0")}:00`,
                count: selected.hourly[i],
              }));
              return (
                <>
                  {/* Device header */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: "48px", height: "48px", backgroundColor: cfg.bg, border: `2px solid ${cfg.border}` }}>
                        <Cpu size={20} style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h2 style={{ fontFamily: "var(--font-family-mono)", fontWeight: 800, fontSize: "18px", color: "var(--foreground)" }} className="sm:text-xl lg:text-2xl">{selected.id}</h2>
                          <span className="px-2 py-0.5 rounded text-xs" style={{ fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin size={10} style={{ color: "var(--muted-foreground)" }} />
                          <span style={{ color: "var(--muted-foreground)" }}>{selected.location}, {selected.region}</span>
                        </div>
                      </div>
                    </div>
                    {/* Action buttons - Hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm" style={{ fontWeight: 600, cursor: "pointer", backgroundColor: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                        <Settings size={12} /> <span className="hidden md:inline">Configurer</span>
                      </button>
                      <button className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm" style={{ fontWeight: 600, cursor: "pointer", backgroundColor: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                        <RefreshCw size={12} /> <span className="hidden md:inline">Ping</span>
                      </button>
                    </div>
                  </div>

                  {/* Vitals row - RESPONSIVE GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-5">
                    {/* Health score */}
                    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border shadow-sm flex items-center gap-2 sm:gap-3">
                      <div className="hidden sm:block shrink-0">
                        <HealthScoreRing score={selected.healthScore} />
                      </div>
                      <div className="min-w-0">
                        <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }} className="sm:text-xs">Santé</div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)" }} className="sm:text-sm">Score</div>
                        <div style={{ fontSize: "9px", color: "var(--muted-foreground)" }} className="sm:text-xs">
                          <span className="hidden sm:inline">Composite</span>
                          <span className="sm:hidden">{selected.healthScore}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Battery */}
                    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border shadow-sm">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Battery size={12} style={{ color: selected.battery > 50 ? "#16A34A" : selected.battery > 25 ? "#D97706" : "#EF4444", flexShrink: 0 }} />
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }} className="sm:text-xs">Batterie</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "20px", fontWeight: 700, color: selected.battery > 50 ? "#16A34A" : selected.battery > 25 ? "#D97706" : "#EF4444" }} className="sm:text-2xl lg:text-3xl">
                        {selected.battery > 0 ? `${selected.battery}%` : "—"}
                      </div>
                      <div className="rounded-full mt-1" style={{ height: "4px", backgroundColor: "var(--muted)" }}>
                        <div style={{ width: `${selected.battery}%`, height: "100%", backgroundColor: selected.battery > 50 ? "#16A34A" : selected.battery > 25 ? "#D97706" : "#EF4444", borderRadius: "9999px" }} />
                      </div>
                    </div>

                    {/* Climate */}
                    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border shadow-sm">
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }} className="sm:text-xs">Climat</div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Thermometer size={12} style={{ color: "#D97706", flexShrink: 0 }} />
                        <span style={{ fontFamily: "var(--font-family-mono)", fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }} className="sm:text-base lg:text-lg">
                          {selected.temp != null ? `${selected.temp}°C` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets size={12} style={{ color: "#1A56DB", flexShrink: 0 }} />
                        <span style={{ fontFamily: "var(--font-family-mono)", fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }} className="sm:text-base lg:text-lg">
                          {selected.humidity != null ? `${selected.humidity}%` : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Connectivity */}
                    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border shadow-sm">
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }} className="sm:text-xs">Connectivité</div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Wifi size={12} style={{ color: selected.signal > 0 ? "#1A56DB" : "#EF4444", flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)" }} className="sm:text-sm">
                          <span className="hidden sm:inline">{["Aucun signal", "Faible", "Moyen", "Fort"][selected.signal]}</span>
                          <span className="sm:hidden">{["N/S", "Faible", "Moy.", "Fort"][selected.signal]}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Clock size={10} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                        <span style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-family-mono)" }}>
                          {selected.lastTx}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detection breakdown - RESPONSIVE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
                    {/* Species card */}
                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }} className="sm:text-sm lg:text-base">
                          Espèces
                        </h3>
                        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "18px", fontWeight: 800, color: "#0D9488" }} className="sm:text-xl">{selected.mosquitoes}</span>
                      </div>
                      {[
                        { name: "Anopheles gambiae", count: selected.anopheles, color: "#EF4444", risk: "Vecteur" },
                        { name: "Culex quinquefasciatus", count: selected.culex, color: "#F97316", risk: "Secondaire" },
                        { name: "Aedes aegypti", count: selected.aedes, color: "#8B5CF6", risk: "Faible" },
                      ].map(sp => (
                        <div key={sp.name} className="mb-3 last:mb-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="min-w-0">
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground)", fontStyle: "italic", display: "block", overflow: "hidden", textOverflow: "ellipsis" }} className="sm:text-xs">{sp.name}</span>
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: `${sp.color}18`, color: sp.color, fontWeight: 600, display: "inline-block" }}>{sp.risk}</span>
                            </div>
                            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 700, color: sp.color, flexShrink: 0 }} className="sm:text-sm">{sp.count}</span>
                          </div>
                          <div className="rounded-full" style={{ height: "4px", backgroundColor: "var(--muted)" }}>
                            <div style={{ width: `${selected.mosquitoes > 0 ? (sp.count / selected.mosquitoes) * 100 : 0}%`, height: "100%", backgroundColor: sp.color, borderRadius: "9999px" }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Device info */}
                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                      <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)", marginBottom: "12px" }} className="sm:text-sm lg:text-base">
                        Infos appareil
                      </h3>
                      {[
                        { label: "ID appareil", value: selected.id },
                        { label: "Firmware", value: selected.firmware },
                        { label: "Déployé", value: `Il y a ${selected.deployedDays}j` },
                        { label: "Disponibilité", value: selected.uptime },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2 text-xs sm:text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                          <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
                          <span style={{ fontFamily: "var(--font-family-mono)", fontWeight: 600, color: "var(--foreground)" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 24h activity chart */}
                  <div className="bg-card rounded-xl p-3 sm:p-5 border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
                      <div>
                        <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }} className="sm:text-sm lg:text-base">
                          Activité 24h
                        </h3>
                        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "1px" }} className="sm:text-xs">Captures/heure</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs sm:text-sm">
                        <TrendingUp size={12} style={{ color: "#EF4444" }} />
                        <span style={{ fontFamily: "var(--font-family-mono)", fontWeight: 700, color: "#EF4444" }}>Pic 15:00</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={hours} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                        <XAxis dataKey="h" tick={{ fontSize: 8, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} interval={3} />
                        <YAxis tick={{ fontSize: 8, fill: "#94A3B8", fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#94A3B8" }} />
                        <Area type="monotone" dataKey="count" stroke="#0D9488" strokeWidth={2} fill="url(#hourlyGrad)" name="Captures/h" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Cpu size={36} style={{ color: "var(--muted-foreground)", opacity: 0.3, margin: "0 auto 12px" }} />
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }} className="sm:text-sm">Sélectionner un appareil</p>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }} className="sm:text-xs">Choisissez un MoustiBox dans la liste</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
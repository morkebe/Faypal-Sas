import { useState } from "react";
import {
  FileText, Download, Plus, Search, Calendar,
  BarChart3, MapPin, Cpu, Shield, Clock, CheckCircle, X,
} from "lucide-react";

const REPORT_TYPES = {
  epidemio:  { label: "Épidémiologique", color: "#EF4444", bg: "#FEF2F2", Icon: Shield },
  vector:    { label: "Vectoriel",        color: "#1A56DB", bg: "#EFF6FF", Icon: Cpu },
  climate:   { label: "Climatique",       color: "#0D9488", bg: "#F0FDFA", Icon: BarChart3 },
  regional:  { label: "Régional",         color: "#7C3AED", bg: "#F5F3FF", Icon: MapPin },
};

const REPORTS = [
  {
    id: "RPT-2025-024", title: "Rapport Épidémiologique — Juillet 2025",
    type: "epidemio", region: "Sénégal (national)", date: "11 Jul 2025",
    size: "2.4 MB", pages: 18, status: "ready",
    description: "Analyse mensuelle des risques vectoriels, captures MoustiBox et prévisions IA.",
  },
  {
    id: "RPT-2025-023", title: "Surveillance Vectorielle — Kédougou",
    type: "vector", region: "Kédougou", date: "08 Jul 2025",
    size: "1.1 MB", pages: 9, status: "ready",
    description: "Détail des captures Anopheles gambiae sur la zone de Kédougou.",
  },
  {
    id: "RPT-2025-022", title: "Impact Climatique — Saison des pluies",
    type: "climate", region: "Sud Sénégal", date: "05 Jul 2025",
    size: "3.2 MB", pages: 24, status: "ready",
    description: "Corrélation pluies / humidité / activité vectorielle, saison 2025.",
  },
  {
    id: "RPT-2025-021", title: "Rapport Régional — Tambacounda",
    type: "regional", region: "Tambacounda", date: "01 Jul 2025",
    size: "0.9 MB", pages: 7, status: "ready",
    description: "Bilan mensuel district Tambacounda — flux transfrontaliers détectés.",
  },
  {
    id: "RPT-2025-020", title: "Rapport Épidémiologique — Juin 2025",
    type: "epidemio", region: "Sénégal (national)", date: "30 Jun 2025",
    size: "2.1 MB", pages: 16, status: "ready",
    description: "Analyse mensuelle complète du mois de juin 2025.",
  },
  {
    id: "RPT-2025-019", title: "Surveillance Vectorielle — Kolda",
    type: "vector", region: "Kolda", date: "25 Jun 2025",
    size: "0.8 MB", pages: 6, status: "ready",
    description: "Monitoring corridor Casamance — activité pré-saison.",
  },
];

const REGIONS = ["Toutes les régions", "Sénégal (national)", "Kédougou", "Tambacounda", "Kolda", "Thiès", "Dakar"];

export function ReportsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | keyof typeof REPORT_TYPES>("all");
  const [showGenerate, setShowGenerate] = useState(false);
  const [genType, setGenType] = useState<keyof typeof REPORT_TYPES>("epidemio");
  const [genRegion, setGenRegion] = useState("Sénégal (national)");
  const [genPeriod, setGenPeriod] = useState("Juillet 2025");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  const filtered = REPORTS.filter(r => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.region.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1800);
  };

  const handleDownload = (id: string) => {
    setDownloaded(prev => new Set([...prev, id]));
    setTimeout(() => setDownloaded(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5" style={{ fontFamily: "var(--font-family-base)", scrollbarWidth: "none" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "16px", color: "var(--foreground)" }}>
            Rapports
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
            {REPORTS.length} rapports disponibles · Mis à jour aujourd'hui
          </p>
        </div>
        <button
          onClick={() => { setShowGenerate(true); setGenerated(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
          style={{ backgroundColor: "#1A56DB", color: "#fff", border: "none" }}
        >
          <Plus size={14} /> Générer un rapport
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(Object.entries(REPORT_TYPES) as [keyof typeof REPORT_TYPES, typeof REPORT_TYPES[keyof typeof REPORT_TYPES]][]).map(([key, { label, color, bg, Icon }]) => {
          const count = REPORTS.filter(r => r.type === key).length;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(typeFilter === key ? "all" : key)}
              className="rounded-xl p-3 border flex items-center gap-3 cursor-pointer transition-all text-left"
              style={{
                backgroundColor: typeFilter === key ? bg : "var(--card)",
                borderColor: typeFilter === key ? color + "60" : "var(--border)",
                boxShadow: typeFilter === key ? `0 0 0 2px ${color}20` : "none",
              }}
            >
              <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: "34px", height: "34px", backgroundColor: bg }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "20px", fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px", fontWeight: 500 }}>{label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 max-w-sm" style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}>
        <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
        <input
          placeholder="Rechercher un rapport…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent outline-none w-full"
          style={{ fontSize: "13px", color: "var(--foreground)" }}
        />
      </div>

      {/* Report list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText size={32} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Aucun rapport trouvé</p>
          </div>
        ) : filtered.map(report => {
          const cfg = REPORT_TYPES[report.type as keyof typeof REPORT_TYPES];
          const isDownloaded = downloaded.has(report.id);
          return (
            <div
              key={report.id}
              className="bg-card rounded-xl border border-border shadow-sm px-4 py-4 flex items-center gap-4"
            >
              {/* Icon */}
              <div className="rounded-xl flex items-center justify-center shrink-0 hidden sm:flex" style={{ width: "44px", height: "44px", backgroundColor: cfg.bg }}>
                <FileText size={18} style={{ color: cfg.color }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>
                    {report.title}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-xs shrink-0" style={{ fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color, fontSize: "10px" }}>
                    {cfg.label}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "6px" }}>{report.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <MapPin size={10} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{report.region}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={10} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{report.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText size={10} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", color: "var(--muted-foreground)" }}>
                      {report.pages}p · {report.size}
                    </span>
                  </div>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-family-mono)", color: "#94A3B8" }}>{report.id}</span>
                </div>
              </div>

              {/* Download */}
              <button
                onClick={() => handleDownload(report.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-all"
                style={{
                  backgroundColor: isDownloaded ? "#F0FDF4" : "#EFF6FF",
                  border: `1px solid ${isDownloaded ? "#BBF7D0" : "#BFDBFE"}`,
                  color: isDownloaded ? "#16A34A" : "#1A56DB",
                }}
              >
                {isDownloaded ? <CheckCircle size={13} /> : <Download size={13} />}
                <span className="hidden sm:inline">{isDownloaded ? "Téléchargé" : "Télécharger"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Generate modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => { if (!generating) setShowGenerate(false); }}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "16px", color: "var(--foreground)" }}>
                Générer un rapport
              </h3>
              {!generating && (
                <button onClick={() => setShowGenerate(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer" style={{ border: "none", backgroundColor: "transparent" }}>
                  <X size={16} style={{ color: "var(--muted-foreground)" }} />
                </button>
              )}
            </div>

            {generated ? (
              <div className="flex flex-col items-center py-6 gap-3 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F0FDF4" }}>
                  <CheckCircle size={28} style={{ color: "#16A34A" }} />
                </div>
                <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>Rapport généré !</p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {REPORT_TYPES[genType].label} · {genRegion} · {genPeriod}
                </p>
                <button
                  onClick={() => setShowGenerate(false)}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: "#1A56DB", color: "#fff", border: "none" }}
                >
                  <Download size={14} /> Télécharger
                </button>
              </div>
            ) : (
              <>
                {/* Type */}
                <div className="mb-4">
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
                    Type de rapport
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(REPORT_TYPES) as [keyof typeof REPORT_TYPES, typeof REPORT_TYPES[keyof typeof REPORT_TYPES]][]).map(([key, { label, color, bg, Icon }]) => (
                      <button
                        key={key}
                        onClick={() => setGenType(key)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-left"
                        style={{
                          border: `2px solid ${genType === key ? color : "var(--border)"}`,
                          backgroundColor: genType === key ? bg : "var(--input-background)",
                        }}
                      >
                        <Icon size={14} style={{ color: genType === key ? color : "var(--muted-foreground)", flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: genType === key ? color : "var(--foreground)" }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Region */}
                <div className="mb-4">
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    Région
                  </label>
                  <select
                    value={genRegion}
                    onChange={e => setGenRegion(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg outline-none cursor-pointer text-sm"
                    style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)", color: "var(--foreground)" }}
                  >
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>

                {/* Period */}
                <div className="mb-5">
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    Période
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}>
                    <Clock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <input
                      value={genPeriod}
                      onChange={e => setGenPeriod(e.target.value)}
                      className="bg-transparent outline-none flex-1 text-sm"
                      style={{ color: "var(--foreground)" }}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGenerate(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                    style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#1A56DB", color: "#fff", border: "none", opacity: generating ? 0.8 : 1 }}
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Génération…
                      </>
                    ) : (
                      <><BarChart3 size={14} /> Générer</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

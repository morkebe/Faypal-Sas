import { useState, useEffect } from "react";
import { getAlerts, acknowledgeAlert as apiAcknowledge, getZones, createAlert, timeAgo, type AlertResponse, type ZoneResponse } from "../lib/api";
import {
  AlertTriangle, Bell, ShieldAlert, ShieldCheck,
  CheckCircle, Clock, Cpu, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Trash2, ArrowDownUp, Plus, X,
} from "lucide-react";

type AlertStatus = "critical" | "high" | "medium" | "resolved";

interface Alert {
  id: string; region: string; device: string; risk: number;
  status: AlertStatus; time: string; detail: string;
  trend: string; trendUp: boolean; recommendations: string[];
}

const STATIC_ALERTS: Alert[] = [
  {
    id: "ALT-001", region: "Kédougou", device: "MB-01", risk: 91, status: "critical",
    time: "Il y a 2 min", detail: "Anopheles gambiae surge — 47 captures en 1h", trend: "+12%", trendUp: true,
    recommendations: ["Déployer équipes de pulvérisation intra-domiciliaire", "Alerter le district sanitaire de Kédougou", "Renforcer surveillance MB-01/MB-02"],
  },
  {
    id: "ALT-002", region: "Saraya", device: "MB-04", risk: 88, status: "critical",
    time: "Il y a 18 min", detail: "Événement pluvieux — activité vectorielle élevée", trend: "+8%", trendUp: true,
    recommendations: ["Activer protocole saison des pluies", "Distribuer MII dans les villages à 5 km du capteur", "Surveillance renforcée 48h"],
  },
  {
    id: "ALT-003", region: "Tambacounda", device: "MB-03", risk: 85, status: "critical",
    time: "Il y a 5h", detail: "Flux vectoriel transfrontalier détecté", trend: "+7%", trendUp: true,
    recommendations: ["Coordonner avec autorités guinéennes", "Renforcer les postes de surveillance frontaliers", "Test RDT recommandé pour voyageurs"],
  },
  {
    id: "ALT-004", region: "Salémata", device: "MB-07", risk: 82, status: "high",
    time: "Il y a 1h", detail: "MB-07 : seuil humidité dépassé (84%)", trend: "+5%", trendUp: true,
    recommendations: ["Vérifier calibration capteur MB-07", "Activer surveillance nocturne renforcée"],
  },
  {
    id: "ALT-005", region: "Kolda", device: "MB-05", risk: 79, status: "high",
    time: "Il y a 3h", detail: "Corridor Casamance — surveillance pré-saison", trend: "+3%", trendUp: true,
    recommendations: ["Préparer stocks de CTA pour le district", "Informer agents de santé communautaires"],
  },
  {
    id: "ALT-006", region: "Matam", device: "MB-09", risk: 61, status: "medium",
    time: "Il y a 6h", detail: "Signal faible MB-09 — batterie critique (34%)", trend: "-2%", trendUp: false,
    recommendations: ["Planifier remplacement batterie MB-09 sous 24h", "Surveillance manuelle temporaire"],
  },
  {
    id: "ALT-007", region: "Kaolack", device: "MB-13", risk: 67, status: "medium",
    time: "Il y a 8h", detail: "Augmentation modérée captures Culex quinquefasciatus", trend: "+4%", trendUp: true,
    recommendations: ["Évaluation épidémiologique du secteur", "Sensibilisation population locale"],
  },
  {
    id: "ALT-008", region: "Thiès", device: "MB-11", risk: 31, status: "resolved",
    time: "Il y a 12h", detail: "Alerte levée — retour à la normale", trend: "-18%", trendUp: false,
    recommendations: ["Maintenir surveillance standard", "Rapport de clôture à soumettre"],
  },
];

const STATUS: Record<AlertStatus, { color: string; bg: string; border: string; label: string; Icon: React.FC<{ size?: number; style?: React.CSSProperties }> }> = {
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  label: "Critique", Icon: ShieldAlert  },
  high:     { color: "#F97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)", label: "Élevé",    Icon: AlertTriangle },
  medium:   { color: "#EAB308", bg: "rgba(234,179,8,0.1)",  border: "rgba(234,179,8,0.25)",  label: "Moyen",    Icon: Bell         },
  resolved: { color: "#22C55E", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)",  label: "Résolu",   Icon: ShieldCheck  },
};

type SortKey = "risk" | "time";

function mapApiAlert(a: AlertResponse, zones: ZoneResponse[]): Alert {
  const zone = zones.find(z => z.id === a.zone_id);
  const sevMap: Record<string, AlertStatus> = {
    critique: "critical", elevee: "high", moyenne: "medium",
  };
  const status: AlertStatus = a.statut === "acquittee"
    ? "resolved"
    : sevMap[a.severite ?? ""] ?? "medium";
  return {
    id:              a.id,
    region:          zone?.nom ?? a.zone_id.slice(0, 8),
    device:          "—",
    risk:            0,
    status,
    time:            timeAgo(a.declenchee_a),
    detail:          a.message ?? a.type,
    trend:           "",
    trendUp:         false,
    recommendations: [],
  };
}

interface AlertsPageProps {
  userRole?: string;
}

export function AlertsPage({ userRole }: AlertsPageProps) {
  const [filter, setFilter]             = useState<"all" | AlertStatus>("all");
  const [sort, setSort]                 = useState<SortKey>("risk");
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed]       = useState<Set<string>>(new Set());
  const [expanded, setExpanded]         = useState<Set<string>>(new Set());
  const [alerts, setAlerts]             = useState<Alert[]>(STATIC_ALERTS);
  const [zones, setZones]               = useState<ZoneResponse[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState("");
  const [form, setForm]                 = useState({
    zone_id: "", type: "alerte_vectorielle",
    severite: "critique" as "critique" | "elevee" | "moyenne",
    message: "",
  });

  const canCreate = userRole === "admin" || userRole === "epidemiologist";

  const loadData = () =>
    Promise.all([getAlerts(), getZones()])
      .then(([apiAlerts, z]) => {
        setZones(z);
        if (apiAlerts.length > 0) setAlerts(apiAlerts.map(a => mapApiAlert(a, z)));
      })
      .catch(() => { /* backend indisponible — données statiques */ })
      .finally(() => setLoading(false));

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!form.zone_id) { setFormError("Veuillez sélectionner une zone."); return; }
    if (!form.message.trim()) { setFormError("Le message est obligatoire."); return; }
    setSaving(true);
    setFormError("");
    try {
      await createAlert({ zone_id: form.zone_id, type: form.type, severite: form.severite, message: form.message });
      setShowModal(false);
      setForm({ zone_id: "", type: "alerte_vectorielle", severite: "critique", message: "" });
      setLoading(true);
      await loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally { setSaving(false); }
  };

  const acknowledge = async (id: string) => {
    try {
      await apiAcknowledge(id);
    } catch { /* offline — mise à jour locale seulement */ }
    setAcknowledged(prev => new Set([...prev, id]));
  };
  const dismiss     = (id: string) => setDismissed(prev => new Set([...prev, id]));
  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const visible = alerts
    .filter(a => !dismissed.has(a.id))
    .filter(a => filter === "all" || a.status === filter)
    .sort((a, b) => sort === "risk" ? b.risk - a.risk : a.time.localeCompare(b.time));

  const counts = {
    critical: alerts.filter(a => !dismissed.has(a.id) && a.status === "critical").length,
    high:     alerts.filter(a => !dismissed.has(a.id) && a.status === "high").length,
    medium:   alerts.filter(a => !dismissed.has(a.id) && a.status === "medium").length,
    resolved: alerts.filter(a => !dismissed.has(a.id) && a.status === "resolved").length,
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5" style={{ fontFamily: "var(--font-family-base)", scrollbarWidth: "none" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "16px", color: "var(--foreground)" }}>
            Alertes
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
            {counts.critical + counts.high + counts.medium} alertes actives · Sénégal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSort(s => s === "risk" ? "time" : "risk")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
          >
            <ArrowDownUp size={12} />
            {sort === "risk" ? "Tri : Risque" : "Tri : Date"}
          </button>
          <button
            onClick={() => setAcknowledged(new Set(alerts.map(a => a.id)))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#16A34A" }}
          >
            <CheckCircle size={13} /> Tout acquitter
          </button>
          {canCreate && (
            <button
              onClick={() => { setShowModal(true); setFormError(""); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: "#1A56DB", color: "#fff", border: "1px solid #1A56DB" }}
            >
              <Plus size={13} /> Nouvelle alerte
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(["critical","high","medium","resolved"] as const).map(s => {
          const cfg = STATUS[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(f => f === s ? "all" : s)}
              className="rounded-xl p-3 text-left transition-all cursor-pointer"
              style={{
                background: filter === s ? cfg.bg : "var(--card)",
                border: `1px solid ${filter === s ? cfg.border : "var(--border)"}`,
              }}
            >
              <div style={{ fontSize: "22px", fontFamily: "var(--font-family-mono)", fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                {counts[s]}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px", fontWeight: 600 }}>
                {cfg.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {(["all","critical","high","medium","resolved"] as const).map(s => {
          const cfg = s !== "all" ? STATUS[s] : null;
          const count = s === "all" ? alerts.filter(a => !dismissed.has(a.id)).length : counts[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: filter === s ? (cfg?.color ?? "#1A56DB") : "var(--input-background)",
                color: filter === s ? "#fff" : "var(--muted-foreground)",
                border: `1px solid ${filter === s ? (cfg?.color ?? "#1A56DB") : "var(--border)"}`,
              }}
            >
              {s === "all" ? `Tous (${count})` : `${cfg!.label} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>
            Aucune alerte dans cette catégorie.
          </div>
        )}
        {visible.map(alert => {
          const cfg   = STATUS[alert.status];
          const done  = acknowledged.has(alert.id) || alert.status === "resolved";
          const open  = expanded.has(alert.id);
          return (
            <div
              key={alert.id}
              className="bg-card rounded-xl border shadow-sm overflow-hidden transition-all"
              style={{ borderColor: done ? "var(--border)" : cfg.border }}
            >
              {/* Main row */}
              <div className="px-4 py-4 flex items-center gap-4" style={{ opacity: done ? 0.65 : 1 }}>
                <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: "38px", height: "38px", backgroundColor: cfg.bg }}>
                  <cfg.Icon size={16} style={{ color: done ? "var(--muted-foreground)" : cfg.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                      {alert.region}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs shrink-0" style={{ fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "10px" }}>
                      {cfg.label}
                    </span>
                    {done && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#22C55E", fontWeight: 600 }}>
                        <CheckCircle size={10} /> Acquittée
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "6px" }}>{alert.detail}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Cpu size={10} style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", color: "var(--muted-foreground)", fontWeight: 600 }}>{alert.device}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{alert.time}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {alert.trendUp
                        ? <TrendingUp size={10} style={{ color: "#EF4444" }} />
                        : <TrendingDown size={10} style={{ color: "#22C55E" }} />}
                      <span style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", fontWeight: 700, color: alert.trendUp ? "#EF4444" : "#22C55E" }}>
                        {alert.trend}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="px-3 py-1 rounded-full" style={{ fontFamily: "var(--font-family-mono)", fontSize: "14px", fontWeight: 800, backgroundColor: done ? "var(--muted)" : cfg.color, color: done ? "var(--muted-foreground)" : "#fff" }}>
                    {alert.risk}%
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!done && (
                      <button
                        onClick={() => acknowledge(alert.id)}
                        className="text-xs font-semibold cursor-pointer px-2 py-1 rounded-lg transition-colors"
                        style={{ color: "#16A34A", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}
                      >
                        Acquitter
                      </button>
                    )}
                    <button
                      onClick={() => toggleExpand(alert.id)}
                      className="p-1 rounded-lg cursor-pointer"
                      style={{ color: "var(--muted-foreground)", backgroundColor: "var(--input-background)", border: "1px solid var(--border)" }}
                    >
                      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="p-1 rounded-lg cursor-pointer"
                      style={{ color: "#EF4444", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {open && (
                <div className="px-4 pb-4 pt-0" style={{ borderTop: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", marginTop: "12px" }}>
                    Recommandations
                  </p>
                  <ul className="flex flex-col gap-2">
                    {alert.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="rounded-full flex-shrink-0 mt-0.5" style={{ width: "6px", height: "6px", backgroundColor: cfg.color, marginTop: "5px" }} />
                        <span style={{ fontSize: "12px", color: "var(--foreground)" }}>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Nouvelle alerte */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>
                Nouvelle alerte
              </h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Zone */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Zone *
                </label>
                <select
                  value={form.zone_id}
                  onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
                >
                  <option value="">Sélectionner une zone…</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
                </select>
              </div>

              {/* Type */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
                >
                  <option value="alerte_vectorielle">Alerte vectorielle</option>
                  <option value="meteo">Météo</option>
                  <option value="epid">Épidémiologique</option>
                  <option value="capteur">Capteur / MoustiBox</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              {/* Sévérité */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Sévérité
                </label>
                <div className="flex gap-2 mt-1">
                  {(["critique", "elevee", "moyenne"] as const).map(s => {
                    const colors: Record<string, string> = { critique: "#EF4444", elevee: "#F97316", moyenne: "#EAB308" };
                    const labels: Record<string, string> = { critique: "Critique", elevee: "Élevée", moyenne: "Moyenne" };
                    const active = form.severite === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setForm(f => ({ ...f, severite: s }))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                        style={{
                          backgroundColor: active ? `${colors[s]}20` : "var(--input-background)",
                          border: `1px solid ${active ? colors[s] : "var(--border)"}`,
                          color: active ? colors[s] : "var(--muted-foreground)",
                        }}
                      >
                        {labels[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Message *
                </label>
                <textarea
                  rows={3}
                  placeholder="Décrivez l'alerte…"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm resize-none"
                  style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
                />
              </div>

              {formError && (
                <p style={{ fontSize: "12px", color: "#EF4444" }}>{formError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: "#1A56DB", color: "#fff", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Enregistrement…" : "Créer l'alerte"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

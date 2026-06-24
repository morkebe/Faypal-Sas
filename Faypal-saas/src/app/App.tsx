import { useState, useEffect } from "react";
import { clearToken, getToken, getMe, mapBackendRole, getDashboardStats, DashboardStats, timeAgo } from "./lib/api";
import {
  LayoutDashboard, Map, Cpu, BarChart3, Bell, CloudRain,
  FileText, Users, Settings, Search, ChevronDown, TrendingUp,
  TrendingDown, AlertTriangle, Wifi, Shield,
  Bug, MapPin, Zap, Clock, CheckCircle, XCircle, RefreshCw,
  ChevronRight, Globe, Thermometer, Droplets, Menu, X, LogOut,
} from "lucide-react";
import { RiskTrendChart, MosquitoActivityChart, ClimateRiskChart } from "./components/AnalyticsCharts";
import { RiskMapPage } from "./components/RiskMapPage";
import { MoustiBoxPage } from "./components/MoustiBoxPage";
import { AlertsPage } from "./components/AlertsPage";
import { SettingsPage } from "./components/SettingsPage";
import { UsersPage } from "./components/UsersPage";
import { ReportsPage } from "./components/ReportsPage";
import { ClimateDataPage } from "./components/ClimateDataPage";
import { RiskScoresPage } from "./components/RiskScoresPage";
import { AuthPage } from "./components/AuthPage";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import logoIcon from "../imports/ICONE_SECONDAIRE.jpg";

// ── Constantes de navigation ───────────────────────────────────────────────────
const NAV_PERMISSIONS: Record<string, string[]> = {
  admin:          ["Tableau de bord","Carte des risques","MoustiBox","Scores de risque","Alertes","Données climatiques","Rapports","Utilisateurs","Paramètres"],
  epidemiologist: ["Tableau de bord","Carte des risques","Scores de risque","Alertes","Données climatiques","Rapports"],
  researcher:     ["Tableau de bord","Carte des risques","Scores de risque","Données climatiques","Rapports"],
  reader:         ["Tableau de bord","Carte des risques","Scores de risque","Rapports"],
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Tableau de bord", active: true, badge: null },
  { icon: Map, label: "Carte des risques", active: false, badge: null },
  { icon: Cpu, label: "MoustiBox", active: false, badge: "18" },
  { icon: BarChart3, label: "Scores de risque", active: false, badge: null },
  { icon: Bell, label: "Alertes", active: false, badge: "12" },
  { icon: CloudRain, label: "Données climatiques", active: false, badge: null },
  { icon: FileText, label: "Rapports", active: false, badge: null },
  { icon: Users, label: "Utilisateurs", active: false, badge: null },
  { icon: Settings, label: "Paramètres", active: false, badge: null },
];



export default function App() {
  const [user, setUser] = useState<{ name: string; email: string; role: string; roleLabel: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Tableau de bord");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("faypal-theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    const token = getToken();
    if (!token) { setSessionLoading(false); return; }

    getMe()
      .then(me => {
        const { role, roleLabel } = mapBackendRole(me.role);
        setUser({ name: me.nom_complet ?? me.email, email: me.email, role, roleLabel });
      })
      .catch(() => { clearToken(); })
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    getDashboardStats().then(setStats).catch(() => {});
  }, [user]);

  const allowedPages = NAV_PERMISSIONS[user?.role ?? "reader"] ?? NAV_PERMISSIONS.reader;
  const visibleNavItems = NAV_ITEMS.filter(({ label }) => allowedPages.includes(label));
  const currentPage = allowedPages.includes(activeNav) ? activeNav : "Tableau de bord";


  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U";
    return nameStr
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getShortName = (nameStr: string) => {
    if (!nameStr) return "";
    const parts = nameStr.split(" ");
    if (parts.length > 1) {
      if (parts[0].toLowerCase().startsWith("dr")) {
        return `${parts[0]} ${parts[parts.length - 1]}`;
      }
      return parts[parts.length - 1];
    }
    return nameStr;
  };

  if (sessionLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="animate-spin rounded-full mx-auto mb-3" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "#1A56DB" }} />
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage onAuthSuccess={(profile) => setUser(profile)} />
        <Toaster position="top-right" closeButton richColors />
      </>
    );
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ fontFamily: "var(--font-family-base)", backgroundColor: "var(--background)" }}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ transition: "opacity 0.3s" }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col h-full shrink-0 fixed md:relative z-50 transition-all duration-300 w-60 sm:w-64 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } md:w-60 lg:w-64`}
        style={{ backgroundColor: "#0A1628", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 sm:px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <img 
            src={logoIcon} 
            alt="Faypal Logo" 
            className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-white/10" 
          />
          <div className="block">
            <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "clamp(14px, 4vw, 17px)", color: "#F8FAFC", letterSpacing: "-0.02em" }}>
              Fay<span style={{ color: "#0D9488" }}>pal</span>
            </span>
            <div style={{ fontSize: "clamp(7px, 2vw, 9px)", color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "1px" }}>
              Health Intelligence
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 sm:px-3 py-4 overflow-y-auto">
          <div style={{ fontSize: "clamp(8px, 2vw, 10px)", color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, paddingLeft: "10px", marginBottom: "8px" }}>
            Navigation
          </div>
          {visibleNavItems.map(({ icon: Icon, label, badge }) => (
            <button
              key={label}
              onClick={() => {
                setActiveNav(label);
                setSidebarOpen(false);
              }}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150"
              style={{
                backgroundColor: activeNav === label ? "rgba(26,86,219,0.18)" : "transparent",
                color: activeNav === label ? "#60A5FA" : "#94A3B8",
                border: activeNav === label ? "1px solid rgba(26,86,219,0.3)" : "1px solid transparent",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (activeNav !== label) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#CBD5E1";
                }
              }}
              onMouseLeave={(e) => {
                if (activeNav !== label) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8";
                }
              }}
              title={label}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} className="flex-shrink-0" />
                <span style={{ fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 500 }} className="text-white">{label}</span>
              </div>
              {badge && (
                <span
                  className="rounded-full px-1.5 py-0.5"
                  style={{
                    fontSize: "clamp(8px, 2vw, 10px)",
                    fontFamily: "var(--font-family-mono)",
                    fontWeight: 700,
                    backgroundColor: label === "Alertes" ? "#EF4444" : "rgba(26,86,219,0.25)",
                    color: label === "Alertes" ? "#fff" : "#60A5FA",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Org info */}
        <div className="px-3 sm:px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between gap-1 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ width: "30px", height: "30px", backgroundColor: "#1D4ED8", fontSize: "12px", fontWeight: 700 }}
              >
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: "clamp(11px, 2.5vw, 12px)", color: "#CBD5E1", fontWeight: 600 }} className="truncate">{user.name}</p>
                <p style={{ fontSize: "clamp(9px, 2vw, 10px)", color: "#64748B" }} className="truncate">{user.roleLabel}</p>
              </div>
            </div>
            <button
              onClick={() => {
                clearToken();
                setUser(null);
                toast.info("Déconnexion réussie.");
              }}
              className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut size={14} />
            </button>
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(13,148,136,0.12)", border: "1px solid rgba(13,148,136,0.25)" }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" style={{ boxShadow: "0 0 6px #4ADE80" }} />
              <span style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "#34D399", fontWeight: 600 }}>Système opérationnel</span>
            </div>
            <p style={{ fontSize: "clamp(9px, 2vw, 10px)", color: "#64748B", marginTop: "3px" }}>Dernière sync : il y a 2 min</p>
          </div>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top Nav */}
        <header
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0 gap-3 sm:gap-0"
          style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)", zIndex: 10 }}
        >
          {/* Left: Menu toggle + breadcrumb + title */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden flex-shrink-0"
              style={{ width: "clamp(32px, 8vw, 36px)", height: "clamp(32px, 8vw, 36px)", backgroundColor: "var(--input-background)", border: "1px solid var(--border)", cursor: "pointer", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {sidebarOpen ? <X size={16} style={{ color: "var(--foreground)" }} /> : <Menu size={16} style={{ color: "var(--foreground)" }} />}
            </button>
            <div className="flex-1 sm:flex-none">
              <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: "1px" }}>
                <span style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "var(--muted-foreground)" }}>Sénégal</span>
                <ChevronRight size={10} style={{ color: "var(--muted-foreground)" }} className="flex-shrink-0" />
                <span style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "var(--primary)", fontWeight: 600 }} className="truncate">{currentPage}</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "clamp(13px, 3vw, 14px)", color: "var(--foreground)", lineHeight: 1 }} className="truncate">
                {currentPage}
              </h1>
            </div>
          </div>

          {/* Search + Controls */}
          <div className="flex items-center gap-2 w-full sm:flex-1 sm:max-w-xs sm:mx-4 md:max-w-md order-4 sm:order-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1" style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)" }}>
              <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <input
                placeholder="Rechercher…"
                className="bg-transparent outline-none w-full hidden sm:block"
                style={{ fontSize: "clamp(12px, 2.5vw, 13px)", color: "var(--foreground)" }}
              />
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3 order-3 sm:order-3">
            {/* Date range */}
            <button
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm"
              style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", cursor: "pointer" }}
            >
              <Clock size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <span className="hidden md:inline">1 juil – 11 juil</span>
              <ChevronDown size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            </button>

            {/* Refresh */}
            <button
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: "36px", height: "36px", backgroundColor: "var(--input-background)", border: "1px solid var(--border)", cursor: "pointer" }}
              title="Actualiser les données"
            >
              <RefreshCw size={14} style={{ color: "var(--muted-foreground)" }} />
            </button>

            {/* Notifications */}
            <button
              className="flex items-center justify-center rounded-lg relative flex-shrink-0"
              style={{ width: "36px", height: "36px", backgroundColor: "var(--input-background)", border: "1px solid var(--border)", cursor: "pointer" }}
            >
              <Bell size={14} style={{ color: "var(--muted-foreground)" }} />
              <span
                className="absolute top-1.5 right-1.5 rounded-full"
                style={{ width: "8px", height: "8px", backgroundColor: "#EF4444", border: "1.5px solid white" }}
              />
            </button>

            {/* Avatar */}
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer relative hidden sm:flex"
              style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <div
                className="rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ width: "26px", height: "26px", backgroundColor: "#1D4ED8", fontSize: "11px", fontWeight: 700 }}
              >
                {getInitials(user.name)}
              </div>
              <span style={{ fontSize: "clamp(11px, 2.5vw, 12px)", fontWeight: 500, color: "var(--foreground)" }} className="hidden md:inline">{getShortName(user.name)}</span>
              <ChevronDown size={11} style={{ color: "var(--muted-foreground)" }} className="hidden md:inline flex-shrink-0" />

              {/* Profile Floating Menu Dropdown */}
              {profileMenuOpen && (
                <div 
                  className="absolute right-0 top-11 w-48 rounded-lg shadow-xl border border-border bg-card p-1 z-[100]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-border text-left">
                    <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      clearToken();
                      setUser(null);
                      setProfileMenuOpen(false);
                      toast.info("Déconnexion réussie.");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors cursor-pointer text-left"
                  >
                    <LogOut size={13} />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Full-page views for Risk Map and MoustiBox */}
        {currentPage === "Carte des risques" && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <RiskMapPage />
          </div>
        )}
        {currentPage === "Scores de risque" && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <RiskScoresPage userRole={user?.role} />
          </div>
        )}
        {currentPage === "MoustiBox" && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <MoustiBoxPage />
          </div>
        )}
        {currentPage === "Alertes" && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <AlertsPage userRole={user.role} />
          </div>
        )}
        {currentPage === "Paramètres" && (
          <div className="flex-1 min-h-0 overflow-hidden flex">
            <SettingsPage />
          </div>
        )}
        {currentPage === "Utilisateurs" && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <UsersPage />
          </div>
        )}
        {currentPage === "Rapports" && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <ReportsPage />
          </div>
        )}
        {currentPage === "Données climatiques" && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <ClimateDataPage />
          </div>
        )}

        {/* Contenu principal — Tableau de bord uniquement */}
        {currentPage === "Tableau de bord" && (
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5" style={{ scrollbarWidth: "none" }}>

          {/* KPI Row */}
          {(() => {
            const c = stats?.capteurs;
            const kpis = [
              { label: "Total MoustiBox",      value: c?.total      ?? "—", sub: "Capteurs déployés",   icon: Cpu,           iconBg: "rgba(59,130,246,0.13)",  iconColor: "#1A56DB", trend: "Sénégal",                        trendUp: true,  alert: false },
              { label: "MoustiBox Actifs",     value: c?.actifs     ?? "—", sub: "Transmission active", icon: CheckCircle,   iconBg: "rgba(22,163,74,0.13)",   iconColor: "#16A34A", trend: c ? `${Math.round((c.actifs/Math.max(c.total,1))*100)}% dispo` : "—", trendUp: true, alert: false },
              { label: "MoustiBox Alertes",    value: c?.en_alerte  ?? "—", sub: "Attention requise",   icon: AlertTriangle, iconBg: "rgba(217,119,6,0.13)",   iconColor: "#D97706", trend: "Attention",                      trendUp: true,  alert: (c?.en_alerte ?? 0) > 0 },
              { label: "MoustiBox Hors-ligne", value: c?.hors_ligne ?? "—", sub: "Hors service",        icon: XCircle,       iconBg: "rgba(239,68,68,0.13)",   iconColor: "#EF4444", trend: "Maintenance",                    trendUp: false, alert: (c?.hors_ligne ?? 0) > 0 },
              { label: "Moustiques Détectés",  value: stats?.moustiques_24h ?? "—", sub: "Dernières 24h", icon: Bug,         iconBg: "rgba(13,148,136,0.13)",  iconColor: "#0D9488", trend: "24h",                            trendUp: true,  alert: false },
              { label: "Zones Critiques",      value: stats?.zones_critiques ?? "—", sub: "Score ≥ 50%", icon: Bell,         iconBg: "rgba(124,58,237,0.13)",  iconColor: "#7C3AED", trend: stats?.top_scores?.[0]?.zone ?? "—", trendUp: true, alert: (stats?.zones_critiques ?? 0) > 0 },
            ];
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-5">
                {kpis.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-border hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: "34px", height: "34px", backgroundColor: card.iconBg }}>
                          <Icon size={16} style={{ color: card.iconColor }} />
                        </div>
                        {card.alert && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#EF4444", boxShadow: "0 0 6px #EF4444" }} />}
                      </div>
                      <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>{card.value}</div>
                      <div style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "var(--muted-foreground)", marginTop: "4px", lineHeight: 1.3 }}>{card.label}</div>
                      <div className="flex items-center gap-1 mt-2">
                        {card.trendUp ? <TrendingUp size={11} style={{ color: "#EF4444" }} /> : <TrendingDown size={11} style={{ color: "#16A34A" }} />}
                        <span style={{ fontSize: "clamp(9px, 2vw, 10px)", fontFamily: "var(--font-family-mono)", color: card.trendUp ? "#EF4444" : "#16A34A", fontWeight: 600 }}>{card.trend}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Map + Alerts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-5">

            {/* Map Panel */}
            <div className="lg:col-span-3 bg-card rounded-lg sm:rounded-xl border border-border shadow-sm overflow-hidden" style={{ minHeight: "280px", height: "auto" }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 gap-2 sm:gap-0" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Globe size={14} style={{ color: "var(--primary)" }} className="flex-shrink-0" />
                  <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, fontSize: "clamp(12px, 3vw, 13px)", color: "var(--foreground)" }} className="truncate">
                    Sénégal — Carte des risques
                  </span>
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs flex-shrink-0"
                    style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" style={{ boxShadow: "0 0 4px #4ADE80" }} />
                    <span className="hidden sm:inline text-xs">Live</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: "clamp(10px, 2vw, 11px)", color: "var(--muted-foreground)", fontFamily: "var(--font-family-mono)" }} className="hidden sm:inline">
                    Mis à jour : 14:32 UTC
                  </span>
                  <button
                    className="px-2 sm:px-3 py-1.5 rounded-lg text-xs"
                    style={{ backgroundColor: "#EFF6FF", color: "#1A56DB", fontWeight: 600, cursor: "pointer", border: "1px solid #BFDBFE" }}
                  >
                    Plein écran
                  </button>
                </div>
              </div>
              <div style={{ height: "clamp(320px, 55vh, 480px)" }}>
                <RiskMapPage />
              </div>
            </div>

            {/* Alert Panel */}
            <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-sm flex flex-col" style={{ minHeight: "280px" }}>
              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 md:py-4 gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={15} style={{ color: "#EF4444", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, fontSize: "clamp(12px, 3vw, 13px)", color: "var(--foreground)" }} className="truncate">
                    Alertes
                  </span>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full flex-shrink-0 text-xs"
                  style={{ backgroundColor: "#FEF2F2", color: "#EF4444", fontWeight: 700, fontFamily: "var(--font-family-mono)", border: "1px solid #FECACA" }}
                >
                  {stats?.alertes_recentes?.length ?? "—"}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-3" style={{ scrollbarWidth: "none" }}>
                {(stats?.alertes_recentes ?? []).slice(0, 3).map((alerte) => {
                  const isCritique = alerte.severite === "critique" || alerte.severite === "eleve";
                  const bgColor = isCritique ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.08)";
                  const borderColor = isCritique ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)";
                  const dotColor = isCritique ? "#EF4444" : "#F97316";
                  return (
                    <div
                      key={alerte.id}
                      className="rounded-lg p-2 sm:p-3 mb-2.5 cursor-pointer transition-all duration-150 hover:shadow-sm"
                      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="rounded-full flex-shrink-0" style={{ width: "8px", height: "8px", backgroundColor: dotColor, marginTop: "2px", boxShadow: `0 0 6px ${dotColor}` }} />
                          <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "clamp(12px, 2.5vw, 13px)", color: "var(--foreground)" }} className="truncate">
                            {alerte.zone}
                          </span>
                        </div>
                        {alerte.score != null && (
                          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "clamp(10px, 2vw, 11px)", fontWeight: 700, color: dotColor }}>{alerte.score}%</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <MapPin size={10} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                        <span style={{ fontSize: "clamp(9px, 2vw, 10px)", color: "var(--muted-foreground)", fontFamily: "var(--font-family-mono)" }} className="truncate">
                          {timeAgo(alerte.declenchee_a)}
                        </span>
                      </div>
                      <p style={{ fontSize: "clamp(9px, 2vw, 11px)", color: "#64748B", lineHeight: 1.4 }}>{alerte.message ?? alerte.type}</p>
                    </div>
                  );
                })}
                {!stats && <p style={{ fontSize: "12px", color: "var(--muted-foreground)", textAlign: "center", marginTop: "16px" }}>Chargement…</p>}
                {stats && stats.alertes_recentes.length === 0 && <p style={{ fontSize: "12px", color: "var(--muted-foreground)", textAlign: "center", marginTop: "16px" }}>Aucune alerte active</p>}
              </div>

              <div className="px-3 sm:px-4 py-2.5 md:py-3" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  className="w-full py-2 rounded-lg text-xs sm:text-sm"
                  style={{ backgroundColor: "#EFF6FF", color: "#1A56DB", fontWeight: 600, cursor: "pointer", border: "1px solid #BFDBFE" }}
                  onClick={() => setActiveNav("Alertes")}
                >
                  Voir toutes les alertes →
                </button>
              </div>
            </div>
          </div>

          {/* Charts + MoustiBox Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4">
            <RiskTrendChart />
            <MosquitoActivityChart />
            <ClimateRiskChart />
          </div>

          {/* MoustiBox Device Status */}
          <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-sm mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <Cpu size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, fontSize: "clamp(12px, 3vw, 13px)", color: "var(--foreground)" }} className="truncate">
                  Flotte MoustiBox
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 flex-wrap text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle size={12} style={{ color: "#16A34A", flexShrink: 0 }} />
                  <span style={{ fontSize: "clamp(11px, 2vw, 12px)", color: "#16A34A", fontWeight: 600 }}>{stats?.capteurs.actifs ?? "—"} Actifs</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={12} style={{ color: "#D97706", flexShrink: 0 }} />
                  <span style={{ fontSize: "clamp(11px, 2vw, 12px)", color: "#D97706", fontWeight: 600 }}>{stats?.capteurs.en_alerte ?? "—"} Alerte</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle size={12} style={{ color: "#EF4444", flexShrink: 0 }} />
                  <span style={{ fontSize: "clamp(11px, 2vw, 12px)", color: "#EF4444", fontWeight: 600 }}>{stats?.capteurs.hors_ligne ?? "—"} Hors-ligne</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-0">
              {(stats?.flotte ?? []).map((dev, i) => {
                const isOffline = dev.statut === "hors_ligne";
                const isWarning = dev.statut === "alerte";
                return (
                  <div
                    key={dev.id}
                    className="p-2 sm:p-3 md:p-4 border-r border-b"
                    style={{
                      borderRightColor: "var(--border)",
                      borderBottomColor: i >= (stats?.flotte.length ?? 0) - 3 ? "transparent" : "var(--border)",
                      backgroundColor: isOffline ? "rgba(239,68,68,0.07)" : isWarning ? "rgba(249,115,22,0.07)" : "transparent",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "clamp(10px, 2vw, 11px)", fontWeight: 700, color: "var(--foreground)" }} className="truncate">
                        {dev.numero_serie}
                      </span>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isOffline ? "#EF4444" : isWarning ? "#FBBF24" : "#4ADE80" }} />
                    </div>
                    <p style={{ fontSize: "clamp(9px, 2vw, 10px)", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }} className="truncate">
                      {dev.zone}
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      <Wifi size={10} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                      <span style={{ fontSize: "clamp(8px, 2vw, 9px)", color: "var(--muted-foreground)", fontFamily: "var(--font-family-mono)" }} className="truncate">
                        {dev.vu_le ? timeAgo(dev.vu_le) : "Jamais"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Stats Strip */}
          <div
            className="rounded-lg sm:rounded-xl px-3 sm:px-4 md:px-6 py-3 md:py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4"
            style={{ background: "linear-gradient(135deg, #0A1628 0%, #1D4ED8 100%)" }}
          >
            {[
              { label: "Modèle IA", value: "v2.4.1", icon: Zap },
              { label: "Points de données", value: "2.8M", icon: BarChart3 },
              { label: "Précision", value: "94.3%", icon: Shield },
              { label: "Sync OMS", value: "Connecté", icon: Globe },
              { label: "MSAS", value: "Actif", icon: CheckCircle },
              { label: "Temp.", value: "31.4°C", icon: Thermometer },
              { label: "Humidité", value: "74%", icon: Droplets },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1 sm:gap-1.5 md:gap-2 min-w-0">
                <Icon size={12} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
                <div className="min-w-0">
                  <div style={{ fontSize: "clamp(7px, 1.5vw, 8px)", color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" }} className="truncate hidden sm:block">{label}</div>
                  <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "clamp(10px, 2.5vw, 11px)", fontWeight: 700, color: "#F8FAFC" }} className="truncate">{value}</div>
                </div>
              </div>
            ))}
          </div>

        </main>
        )}
      </div>
    </div>
  );
}

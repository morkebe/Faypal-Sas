import { useState, useEffect } from "react";
import {
  User, Bell, Palette, Cpu, Globe, Lock,
  Save, Check, Mail, Phone, Moon, Sun,
  MapPin, Plus, Trash2, ChevronDown, ChevronRight, Loader, X, Eye, EyeOff,
} from "lucide-react";
import { getZones, createZone, deleteZone, changePassword, type ZoneResponse } from "../lib/api";

const SECTIONS = [
  { id: "profile",       label: "Profil",         Icon: User    },
  { id: "notifications", label: "Notifications",   Icon: Bell    },
  { id: "appearance",   label: "Apparence",        Icon: Palette },
  { id: "system",       label: "Système",          Icon: Cpu     },
  { id: "integrations", label: "Intégrations",     Icon: Globe   },
  { id: "security",     label: "Sécurité",         Icon: Lock    },
  { id: "zones",        label: "Zones",            Icon: MapPin  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative cursor-pointer shrink-0"
      style={{
        width: "40px", height: "22px",
        backgroundColor: checked ? "#1A56DB" : "#CBD5E1",
        borderRadius: "999px", border: "none",
        transition: "background-color 0.2s",
      }}
    >
      <span
        className="absolute top-0.5"
        style={{
          left: checked ? "20px" : "2px",
          width: "18px", height: "18px",
          backgroundColor: "#fff",
          borderRadius: "50%",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          display: "block",
        }}
      />
    </button>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <div>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{label}</p>
        {sub && <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "1px" }}>{sub}</p>}
      </div>
      <div className="ml-4 shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-4">
      <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "14px", color: "var(--foreground)", marginBottom: "4px" }}>
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const [active, setActive]   = useState("profile");
  const [saved, setSaved]     = useState(false);

  // ── Zones ──────────────────────────────────────────────────────────────────
  const [zones, setZones]           = useState<ZoneResponse[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneForm, setZoneForm]     = useState({ nom: "", niveau: "region" as "region" | "district", parent_id: "" });
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zoneError, setZoneError]   = useState("");

  const loadZones = () => {
    setZonesLoading(true);
    getZones().then(setZones).catch(() => {}).finally(() => setZonesLoading(false));
  };

  useEffect(() => { if (active === "zones") loadZones(); }, [active]);

  const regions   = zones.filter(z => z.niveau === "region");
  const districts = zones.filter(z => z.niveau === "district");

  const toggleRegion = (id: string) =>
    setExpandedRegions(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCreateZone = async () => {
    if (!zoneForm.nom.trim()) { setZoneError("Le nom est obligatoire."); return; }
    if (zoneForm.niveau === "district" && !zoneForm.parent_id) { setZoneError("Sélectionnez une région parente."); return; }
    setZoneSaving(true); setZoneError("");
    try {
      await createZone({ nom: zoneForm.nom, niveau: zoneForm.niveau, parent_id: zoneForm.parent_id || undefined });
      setShowZoneModal(false);
      setZoneForm({ nom: "", niveau: "region", parent_id: "" });
      loadZones();
    } catch (e: unknown) {
      setZoneError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally { setZoneSaving(false); }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Supprimer cette zone ? Les alertes et capteurs liés seront aussi supprimés.")) return;
    try { await deleteZone(id); loadZones(); } catch {}
  };
  const [theme, setTheme]     = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  const applyTheme = (t: "light" | "dark") => {
    setTheme(t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("faypal-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("faypal-theme", "light");
    }
  };
  const [lang, setLang]           = useState("Français");
  const [timezone, setTimezone]   = useState("Africa/Dakar (UTC+0)");

  // ── Mot de passe ───────────────────────────────────────────────────────────
  const [pwActuel, setPwActuel]   = useState("");
  const [pwNouveau, setPwNouveau] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]     = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handlePasswordChange = async () => {
    setPwError(""); setPwSuccess(false);
    if (!pwActuel || !pwNouveau || !pwConfirm) { setPwError("Tous les champs sont obligatoires."); return; }
    if (pwNouveau !== pwConfirm) { setPwError("Les nouveaux mots de passe ne correspondent pas."); return; }
    if (pwNouveau.length < 6) { setPwError("Le nouveau mot de passe doit contenir au moins 6 caractères."); return; }
    setPwLoading(true);
    try {
      await changePassword(pwActuel, pwNouveau);
      setPwSuccess(true);
      setPwActuel(""); setPwNouveau(""); setPwConfirm("");
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : "Erreur lors du changement de mot de passe");
    } finally { setPwLoading(false); }
  };
  const [syncInterval, setSyncInterval] = useState("5 min");
  const [riskThreshold, setRiskThreshold] = useState(80);

  const [notifs, setNotifs] = useState({
    critical: true, high: true, medium: false,
    email: true, sms: false, weeklyReport: true,
  });

  const toggleNotif = (k: keyof typeof notifs) =>
    setNotifs(prev => ({ ...prev, [k]: !prev[k] }));

  const integrations = [
    { name: "WHO Global Health", status: "connected",    color: "#16A34A" },
    { name: "MSAS Sénégal",      status: "connected",    color: "#16A34A" },
    { name: "Météo API",         status: "connected",    color: "#16A34A" },
    { name: "OpenStreetMap",     status: "connected",    color: "#16A34A" },
    { name: "CDC Africa",        status: "disconnected", color: "#EF4444" },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ fontFamily: "var(--font-family-base)" }}>

      {/* Sidebar nav */}
      <aside className="hidden sm:flex flex-col w-48 shrink-0 border-r border-border bg-card overflow-y-auto py-4 px-2">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 w-full text-left cursor-pointer transition-all"
            style={{
              backgroundColor: active === id ? "rgba(26,86,219,0.1)" : "transparent",
              color: active === id ? "#1A56DB" : "var(--muted-foreground)",
              border: active === id ? "1px solid rgba(26,86,219,0.2)" : "1px solid transparent",
              fontWeight: active === id ? 700 : 500,
              fontSize: "13px",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5" style={{ scrollbarWidth: "none" }}>

        {/* Mobile section selector */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 sm:hidden" style={{ scrollbarWidth: "none" }}>
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
              style={{
                backgroundColor: active === id ? "#1A56DB" : "var(--input-background)",
                color: active === id ? "#fff" : "var(--muted-foreground)",
                border: `1px solid ${active === id ? "#1A56DB" : "var(--border)"}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Profil ── */}
        {active === "profile" && (
          <>
            <Section title="Informations personnelles">
              <div className="flex items-center gap-4 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ backgroundColor: "#1D4ED8" }}>
                  MS
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>Dr. Mamadou Sy</p>
                  <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Administrateur · MSAS</p>
                </div>
              </div>
              {[
                { label: "Nom complet",  placeholder: "Dr. Mamadou Sy",              icon: User },
                { label: "Email",        placeholder: "mamadou.sy@msas.gouv.sn",     icon: Mail },
                { label: "Téléphone",    placeholder: "+221 77 000 00 00",            icon: Phone },
              ].map(({ label, placeholder, icon: Icon }) => (
                <div key={label} className="py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    {label}
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}>
                    <Icon size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <input
                      defaultValue={placeholder}
                      className="bg-transparent outline-none flex-1"
                      style={{ fontSize: "13px", color: "var(--foreground)" }}
                    />
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Rôle & Organisation">
              <Row label="Organisation" sub="Ministère de la Santé">
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)" }}>MSAS Sénégal</span>
              </Row>
              <Row label="Rôle" sub="Niveau d'accès complet">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "#EFF6FF", color: "#1A56DB", border: "1px solid #BFDBFE" }}>
                  Administrateur
                </span>
              </Row>
            </Section>
          </>
        )}

        {/* ── Notifications ── */}
        {active === "notifications" && (
          <>
            <Section title="Alertes">
              <Row label="Alertes critiques" sub="Risque ≥ 85%">
                <Toggle checked={notifs.critical} onChange={() => toggleNotif("critical")} />
              </Row>
              <Row label="Alertes élevées" sub="Risque entre 70–84%">
                <Toggle checked={notifs.high} onChange={() => toggleNotif("high")} />
              </Row>
              <Row label="Alertes moyennes" sub="Risque entre 50–69%">
                <Toggle checked={notifs.medium} onChange={() => toggleNotif("medium")} />
              </Row>
            </Section>
            <Section title="Canaux">
              <Row label="Notifications email" sub="mamadou.sy@msas.gouv.sn">
                <Toggle checked={notifs.email} onChange={() => toggleNotif("email")} />
              </Row>
              <Row label="Notifications SMS" sub="+221 77 000 00 00">
                <Toggle checked={notifs.sms} onChange={() => toggleNotif("sms")} />
              </Row>
              <Row label="Rapport hebdomadaire" sub="Envoyé chaque lundi à 8h00">
                <Toggle checked={notifs.weeklyReport} onChange={() => toggleNotif("weeklyReport")} />
              </Row>
            </Section>
          </>
        )}

        {/* ── Apparence ── */}
        {active === "appearance" && (
          <>
            <Section title="Thème">
              <div className="flex gap-3 py-4">
                {(["light", "dark"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => applyTheme(t)}
                    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      border: `2px solid ${theme === t ? "#1A56DB" : "var(--border)"}`,
                      backgroundColor: theme === t ? "#EFF6FF" : "var(--input-background)",
                    }}
                  >
                    {t === "light" ? <Sun size={20} style={{ color: theme === t ? "#1A56DB" : "var(--muted-foreground)" }} /> : <Moon size={20} style={{ color: theme === t ? "#1A56DB" : "var(--muted-foreground)" }} />}
                    <span style={{ fontSize: "12px", fontWeight: 700, color: theme === t ? "#1A56DB" : "var(--muted-foreground)" }}>
                      {t === "light" ? "Clair" : "Sombre"}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Langue & Région">
              <Row label="Langue" sub="Interface utilisateur">
                <select
                  value={lang}
                  onChange={e => setLang(e.target.value)}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer outline-none"
                  style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)", color: "var(--foreground)" }}
                >
                  <option>Français</option>
                  <option>English</option>
                  <option>Wolof</option>
                </select>
              </Row>
              <Row label="Fuseau horaire" sub="Heure locale">
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer outline-none"
                  style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)", color: "var(--foreground)" }}
                >
                  <option>Africa/Dakar (UTC+0)</option>
                  <option>Europe/Paris (UTC+1)</option>
                </select>
              </Row>
            </Section>
          </>
        )}

        {/* ── Système ── */}
        {active === "system" && (
          <>
            <Section title="MoustiBox">
              <Row label="Intervalle de synchronisation" sub="Fréquence de collecte des données">
                <select
                  value={syncInterval}
                  onChange={e => setSyncInterval(e.target.value)}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer outline-none"
                  style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)", color: "var(--foreground)" }}
                >
                  <option>1 min</option>
                  <option>5 min</option>
                  <option>15 min</option>
                  <option>30 min</option>
                </select>
              </Row>
              <Row label="Seuil critique" sub={`Risque ≥ ${riskThreshold}% → alerte critique`}>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={50} max={95} step={5}
                    value={riskThreshold}
                    onChange={e => setRiskThreshold(Number(e.target.value))}
                    style={{ width: "80px", accentColor: "#1A56DB" }}
                  />
                  <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "12px", fontWeight: 700, color: "#1A56DB", minWidth: "32px" }}>{riskThreshold}%</span>
                </div>
              </Row>
            </Section>
            <Section title="Données">
              <Row label="Rétention des données" sub="Durée de conservation des logs">
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>90 jours</span>
              </Row>
              <Row label="Espace utilisé" sub="Base de données locale">
                <div className="flex items-center gap-2">
                  <div className="rounded-full overflow-hidden" style={{ width: "60px", height: "6px", backgroundColor: "var(--muted)" }}>
                    <div style={{ width: "42%", height: "100%", backgroundColor: "#1A56DB", borderRadius: "999px" }} />
                  </div>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-family-mono)", color: "var(--muted-foreground)" }}>2.1 GB</span>
                </div>
              </Row>
            </Section>
          </>
        )}

        {/* ── Intégrations ── */}
        {active === "integrations" && (
          <Section title="Services connectés">
            {integrations.map(({ name, status, color }) => (
              <Row key={name} label={name}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color }}>
                    {status === "connected" ? "Connecté" : "Déconnecté"}
                  </span>
                  {status === "disconnected" && (
                    <button className="text-xs px-2 py-0.5 rounded-lg cursor-pointer font-semibold" style={{ backgroundColor: "#EFF6FF", color: "#1A56DB", border: "1px solid #BFDBFE" }}>
                      Connecter
                    </button>
                  )}
                </div>
              </Row>
            ))}
          </Section>
        )}

        {/* ── Sécurité ── */}
        {active === "security" && (
          <>
            <Section title="Mot de passe">
              {([
                { label: "Mot de passe actuel",  value: pwActuel,  set: setPwActuel  },
                { label: "Nouveau mot de passe", value: pwNouveau, set: setPwNouveau },
                { label: "Confirmer",            value: pwConfirm, set: setPwConfirm },
              ] as { label: string; value: string; set: (v: string) => void }[]).map(({ label, value, set }, i) => (
                <div key={label} className="py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    {label}
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="bg-transparent outline-none flex-1"
                      style={{ fontSize: "13px", color: "var(--foreground)" }}
                    />
                    {i === 0 && (
                      <button onClick={() => setShowPw(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {pwError && <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "8px" }}>{pwError}</p>}
              {pwSuccess && <p style={{ fontSize: "12px", color: "#16A34A", marginTop: "8px", fontWeight: 600 }}>✓ Mot de passe modifié avec succès</p>}
              <div className="flex justify-end mt-4">
                <button
                  onClick={handlePasswordChange}
                  disabled={pwLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: pwSuccess ? "#16A34A" : "#1A56DB", color: "#fff", border: "none", opacity: pwLoading ? 0.7 : 1 }}
                >
                  {pwLoading ? <><Loader size={14} className="animate-spin" /> Modification…</> : pwSuccess ? <><Check size={14} /> Modifié</> : <><Save size={14} /> Changer le mot de passe</>}
                </button>
              </div>
            </Section>
            <Section title="Sessions actives">
              {[
                { device: "Chrome · Windows 11",   ip: "192.168.1.12",  time: "Maintenant",  current: true },
                { device: "Safari · iPhone 15",     ip: "41.82.xxx.xxx", time: "Il y a 2h",   current: false },
              ].map(({ device, ip, time, current }) => (
                <Row key={device} label={device} sub={`${ip} · ${time}`}>
                  {current
                    ? <span style={{ fontSize: "11px", fontWeight: 700, color: "#16A34A" }}>Session actuelle</span>
                    : <button className="text-xs px-2 py-1 rounded-lg cursor-pointer font-semibold" style={{ backgroundColor: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}>Révoquer</button>}
                </Row>
              ))}
            </Section>
          </>
        )}

        {/* ── Zones ── */}
        {active === "zones" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>Zones géographiques</h3>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>{regions.length} régions · {districts.length} districts</p>
              </div>
              <button
                onClick={() => { setShowZoneModal(true); setZoneError(""); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#1A56DB", color: "#fff", border: "none" }}
              >
                <Plus size={13} /> Nouvelle zone
              </button>
            </div>

            {zonesLoading ? (
              <div className="flex items-center justify-center gap-2 py-16">
                <Loader size={18} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
                <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Chargement…</span>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {regions.length === 0 && (
                  <p className="text-center py-10" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Aucune zone. Cliquez sur "Nouvelle zone".</p>
                )}
                {regions.map((region, ri) => {
                  const children = districts.filter(d => d.parent_id === region.id);
                  const open = expandedRegions.has(region.id);
                  return (
                    <div key={region.id} style={{ borderBottom: ri < regions.length - 1 ? "1px solid var(--border)" : "none" }}>
                      {/* Région row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button onClick={() => toggleRegion(region.id)} className="cursor-pointer" style={{ color: "var(--muted-foreground)", background: "none", border: "none", padding: 0 }}>
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <MapPin size={13} style={{ color: "#1A56DB", flexShrink: 0 }} />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)", flex: 1 }}>{region.nom}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(26,86,219,0.1)", color: "#1A56DB", border: "1px solid rgba(26,86,219,0.2)" }}>
                          Région
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{children.length} district{children.length !== 1 ? "s" : ""}</span>
                        <button onClick={() => handleDeleteZone(region.id)} className="p-1 rounded cursor-pointer" style={{ color: "#EF4444", background: "none", border: "none" }} title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {/* Districts */}
                      {open && children.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--muted)", paddingLeft: "48px" }}>
                          <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: "var(--muted-foreground)" }} />
                          <span style={{ fontSize: "12px", color: "var(--foreground)", flex: 1 }}>{d.nom}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488", border: "1px solid rgba(13,148,136,0.2)" }}>
                            District
                          </span>
                          <button onClick={() => handleDeleteZone(d.id)} className="p-1 rounded cursor-pointer" style={{ color: "#EF4444", background: "none", border: "none" }} title="Supprimer">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal nouvelle zone */}
            {showZoneModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                <div className="rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>Nouvelle zone</h3>
                    <button onClick={() => setShowZoneModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
                  </div>
                  <div className="flex flex-col gap-4">
                    {/* Niveau */}
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Niveau</label>
                      <div className="flex gap-2 mt-1">
                        {(["region", "district"] as const).map(n => (
                          <button key={n} onClick={() => setZoneForm(f => ({ ...f, niveau: n, parent_id: "" }))}
                            className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all capitalize"
                            style={{ backgroundColor: zoneForm.niveau === n ? "rgba(26,86,219,0.1)" : "var(--input-background)", border: `1px solid ${zoneForm.niveau === n ? "#1A56DB" : "var(--border)"}`, color: zoneForm.niveau === n ? "#1A56DB" : "var(--muted-foreground)" }}>
                            {n === "region" ? "Région" : "District"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Région parente (si district) */}
                    {zoneForm.niveau === "district" && (
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Région parente *</label>
                        <select value={zoneForm.parent_id} onChange={e => setZoneForm(f => ({ ...f, parent_id: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                          style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}>
                          <option value="">Sélectionner…</option>
                          {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                        </select>
                      </div>
                    )}
                    {/* Nom */}
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Nom *</label>
                      <input
                        placeholder={zoneForm.niveau === "region" ? "ex: Kédougou" : "ex: Saraya"}
                        value={zoneForm.nom}
                        onChange={e => setZoneForm(f => ({ ...f, nom: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
                      />
                    </div>
                    {zoneError && <p style={{ fontSize: "12px", color: "#EF4444" }}>{zoneError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setShowZoneModal(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                        style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                        Annuler
                      </button>
                      <button onClick={handleCreateZone} disabled={zoneSaving} className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                        style={{ backgroundColor: "#1A56DB", color: "#fff", opacity: zoneSaving ? 0.6 : 1, border: "none" }}>
                        {zoneSaving ? "Création…" : "Créer"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        {["profile", "notifications", "appearance", "system"].includes(active) && (
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: saved ? "#16A34A" : "#1A56DB",
                color: "#fff",
                border: "none",
              }}
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? "Enregistré !" : "Enregistrer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

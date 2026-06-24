import { useState, useEffect } from "react";
import {
  Search, Plus, MoreHorizontal, CheckCircle,
  XCircle, Mail, Shield, Clock, UserCheck, X, Loader, RefreshCw,
} from "lucide-react";
import { getUsers, register as apiRegister, updateUserRole, toggleUserActif, timeAgo, type UserResponse } from "../lib/api";

const ROLES = {
  admin:          { label: "Administrateur",  color: "#1A56DB", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)",  backendRole: "admin"         },
  epidemiologist: { label: "Analyste",        color: "#0D9488", bg: "rgba(13,148,136,0.1)",  border: "rgba(13,148,136,0.25)",  backendRole: "analyste"      },
  researcher:     { label: "Agent terrain",   color: "#7C3AED", bg: "rgba(124,58,237,0.1)",  border: "rgba(124,58,237,0.25)",  backendRole: "agent_terrain" },
  reader:         { label: "Lecteur",         color: "#64748B", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.25)", backendRole: "lecteur"       },
};

const BACKEND_ROLE_MAP: Record<string, keyof typeof ROLES> = {
  admin:         "admin",
  analyste:      "epidemiologist",
  agent_terrain: "researcher",
  lecteur:       "reader",
};

function getInitials(name: string): string {
  return name.split(" ").filter(w => /[A-Za-zÀ-ÿ]/.test(w[0] ?? "")).map(w => w[0].toUpperCase()).slice(0, 2).join("") || "?";
}

function mapApiUser(u: UserResponse, idx: number) {
  return {
    id:       u.id,
    name:     u.nom_complet ?? u.email,
    email:    u.email,
    role:     BACKEND_ROLE_MAP[u.role] ?? "reader" as keyof typeof ROLES,
    status:   u.actif ? "active" : "inactive",
    lastSeen: u.derniere_connexion ? timeAgo(u.derniere_connexion) : "Jamais",
    initials: getInitials(u.nom_complet ?? u.email),
    _idx:     idx,
  };
}

const AVATAR_COLORS = ["#1D4ED8", "#0D9488", "#7C3AED", "#D97706", "#16A34A", "#EF4444", "#1D4ED8", "#0D9488"];

type UserRow = ReturnType<typeof mapApiUser>;

export function UsersPage() {
  const [roleFilter, setRoleFilter]   = useState<"all" | keyof typeof ROLES>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch]           = useState("");
  const [showInvite, setShowInvite]   = useState(false);
  const [inviteName, setInviteName]   = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole]   = useState<keyof typeof ROLES>("reader");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [menuOpen, setMenuOpen]       = useState<string | null>(null);
  const [roleModal, setRoleModal]     = useState<{ id: string; name: string; current: keyof typeof ROLES } | null>(null);
  const [newRole, setNewRole]         = useState<keyof typeof ROLES>("reader");
  const [roleLoading, setRoleLoading] = useState(false);
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const loadUsers = (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    getUsers()
      .then(data => setUsers(data.map(mapApiUser)))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    loadUsers();
    const interval = setInterval(() => loadUsers(true), 30_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = users.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleUserActif(id, !isActive);
      loadUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur lors du changement de statut");
    }
  };

  const handleRoleChange = async () => {
    if (!roleModal) return;
    setRoleLoading(true);
    try {
      await updateUserRole(roleModal.id, ROLES[newRole].backendRole);
      setRoleModal(null);
      loadUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally { setRoleLoading(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !invitePassword || !inviteName) {
      setInviteError("Tous les champs sont obligatoires.");
      return;
    }
    setInviteLoading(true);
    setInviteError("");
    try {
      await apiRegister(inviteEmail, invitePassword, inviteName, ROLES[inviteRole].backendRole);
      setShowInvite(false);
      setInviteName(""); setInviteEmail(""); setInvitePassword(""); setInviteRole("reader");
      loadUsers();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5" style={{ fontFamily: "var(--font-family-base)", scrollbarWidth: "none" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "16px", color: "var(--foreground)" }}>
            Utilisateurs
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>
            {users.filter(u => u.status === "active").length} actifs · {users.length} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadUsers(true)}
            disabled={refreshing}
            className="flex items-center justify-center rounded-lg cursor-pointer"
            style={{ width: "36px", height: "36px", backgroundColor: "var(--input-background)", border: "1px solid var(--border)" }}
            title="Rafraîchir"
          >
            <RefreshCw size={14} style={{ color: "var(--muted-foreground)", animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: "#1A56DB", color: "#fff", border: "none" }}
          >
            <Plus size={14} /> Inviter un utilisateur
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[180px] max-w-xs" style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}>
          <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full"
            style={{ fontSize: "13px", color: "var(--foreground)" }}
          />
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "admin", "epidemiologist", "researcher", "reader"] as const).map(r => {
            const cfg = r !== "all" ? ROLES[r] : null;
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                style={{
                  backgroundColor: roleFilter === r ? (cfg?.color ?? "#1A56DB") : "var(--input-background)",
                  color: roleFilter === r ? "#fff" : "var(--muted-foreground)",
                  border: `1px solid ${roleFilter === r ? (cfg?.color ?? "#1A56DB") : "var(--border)"}`,
                }}
              >
                {r === "all" ? "Tous" : cfg!.label}
              </button>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(["all", "active", "inactive"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: statusFilter === s ? "#1A56DB" : "var(--input-background)",
                color: statusFilter === s ? "#fff" : "var(--muted-foreground)",
                border: `1px solid ${statusFilter === s ? "#1A56DB" : "var(--border)"}`,
              }}
            >
              {s === "all" ? "Tous" : s === "active" ? "Actifs" : "Inactifs"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 px-4 py-2.5 hidden sm:grid" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--muted)" }}>
          {["Utilisateur", "Rôle", "Statut", "Dernière connexion", ""].map((h, i) => (
            <div
              key={h}
              className={i === 0 ? "col-span-4" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-2" : "col-span-1"}
              style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader size={18} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <UserCheck size={28} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Aucun utilisateur trouvé</p>
          </div>
        ) : filtered.map((user, idx) => {
          const roleCfg = ROLES[user.role as keyof typeof ROLES];
          const isActive = user.status === "active";
          return (
            <div
              key={user.id}
              className="grid grid-cols-1 sm:grid-cols-12 items-center px-4 py-3 gap-3 sm:gap-0 relative"
              style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              {/* User info */}
              <div className="sm:col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                  {user.initials}
                </div>
                <div className="min-w-0">
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }} className="truncate">{user.name}</p>
                  <div className="flex items-center gap-1">
                    <Mail size={10} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }} className="truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="sm:col-span-3">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: roleCfg.bg, color: roleCfg.color, border: `1px solid ${roleCfg.border}` }}>
                  {roleCfg.label}
                </span>
              </div>

              {/* Status */}
              <div className="sm:col-span-2 flex items-center gap-1.5">
                {isActive
                  ? <CheckCircle size={12} style={{ color: "#16A34A" }} />
                  : <XCircle size={12} style={{ color: "#94A3B8" }} />}
                <span style={{ fontSize: "12px", fontWeight: 600, color: isActive ? "#16A34A" : "#94A3B8" }}>
                  {isActive ? "Actif" : "Inactif"}
                </span>
              </div>

              {/* Last seen */}
              <div className="sm:col-span-2 flex items-center gap-1">
                <Clock size={10} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{user.lastSeen}</span>
              </div>

              {/* Actions */}
              <div className="sm:col-span-1 flex justify-end relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                  className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-muted"
                  style={{ border: "1px solid var(--border)", backgroundColor: "transparent" }}
                >
                  <MoreHorizontal size={14} style={{ color: "var(--muted-foreground)" }} />
                </button>
                {menuOpen === user.id && (
                  <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                    <button
                      onClick={() => { void toggleStatus(user.id, isActive); setMenuOpen(null); }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-muted transition-colors flex items-center gap-2"
                      style={{ color: isActive ? "#EF4444" : "#16A34A" }}
                    >
                      {isActive ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      {isActive ? "Désactiver" : "Activer"}
                    </button>
                    <button
                      onClick={() => {
                        setRoleModal({ id: user.id, name: user.name, current: user.role as keyof typeof ROLES });
                        setNewRole(user.role as keyof typeof ROLES);
                        setMenuOpen(null);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-muted transition-colors flex items-center gap-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      <Shield size={12} /> Changer le rôle
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-muted transition-colors flex items-center gap-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      <Mail size={12} /> Renvoyer l'invitation
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal changement de rôle */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setRoleModal(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>Changer le rôle</h3>
              <button onClick={() => setRoleModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "16px" }}>{roleModal.name}</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(Object.entries(ROLES) as [keyof typeof ROLES, typeof ROLES[keyof typeof ROLES]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setNewRole(key)}
                  className="px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all"
                  style={{ border: `2px solid ${newRole === key ? cfg.color : "var(--border)"}`, backgroundColor: newRole === key ? cfg.bg : "var(--input-background)" }}
                >
                  <p style={{ fontSize: "12px", fontWeight: 700, color: newRole === key ? cfg.color : "var(--foreground)" }}>{cfg.label}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRoleModal(null)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer" style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                Annuler
              </button>
              <button
                onClick={handleRoleChange}
                disabled={roleLoading || newRole === roleModal.current}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                style={{ backgroundColor: "#1A56DB", color: "#fff", opacity: (roleLoading || newRole === roleModal.current) ? 0.6 : 1, border: "none" }}
              >
                {roleLoading ? <><Loader size={14} className="animate-spin" /> Mise à jour…</> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setShowInvite(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "16px", color: "var(--foreground)" }}>
                Créer un utilisateur
              </h3>
              <button onClick={() => setShowInvite(false)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer" style={{ border: "none", backgroundColor: "transparent" }}>
                <X size={16} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Nom */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>Nom complet</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}>
                  <input placeholder="Dr. Prénom Nom" value={inviteName} onChange={e => setInviteName(e.target.value)} className="bg-transparent outline-none flex-1" style={{ fontSize: "13px", color: "var(--foreground)" }} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>Adresse email</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}>
                  <Mail size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <input type="email" placeholder="prenom.nom@msas.gouv.sn" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="bg-transparent outline-none flex-1" style={{ fontSize: "13px", color: "var(--foreground)" }} />
                </div>
              </div>

              {/* Mot de passe temporaire */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>Mot de passe temporaire</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "var(--input-background)" }}>
                  <input type="password" placeholder="Min. 6 caractères" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} className="bg-transparent outline-none flex-1" style={{ fontSize: "13px", color: "var(--foreground)" }} />
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>Rôle</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(ROLES) as [keyof typeof ROLES, typeof ROLES[keyof typeof ROLES]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setInviteRole(key)} className="px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all" style={{ border: `2px solid ${inviteRole === key ? cfg.color : "var(--border)"}`, backgroundColor: inviteRole === key ? cfg.bg : "var(--input-background)" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: inviteRole === key ? cfg.color : "var(--foreground)" }}>{cfg.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {inviteError && (
                <p style={{ fontSize: "12px", color: "#EF4444", fontWeight: 500 }}>{inviteError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer" style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                Annuler
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                style={{ backgroundColor: "#1A56DB", color: "#fff", border: "none", opacity: inviteLoading ? 0.7 : 1 }}
              >
                {inviteLoading ? <><Loader size={14} className="animate-spin" /> Création…</> : "Créer le compte"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpen !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}

import React, { useState } from "react";
import { login as apiLogin, register as apiRegister, getMe, setToken, mapBackendRole } from "../lib/api";
import {
  Shield, Mail, Lock, User, Eye, EyeOff, Sparkles,
  ArrowRight, ShieldCheck, CheckCircle2, AlertCircle,
  Activity, Cpu, BarChart3, Globe
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import logoIcon from "../../imports/ICONE_SECONDAIRE.jpg";

type Role = "admin" | "epidemiologist" | "researcher" | "reader";

const KNOWN_USERS: Record<string, { name: string; role: Role; roleLabel: string }> = {
  "mamadou.sy@msas.gouv.sn": { name: "Dr. Mamadou Sy",     role: "admin",          roleLabel: "Administrateur · MSAS"  },
  "a.diallo@msas.gouv.sn":   { name: "Dr. Aminata Diallo", role: "epidemiologist", roleLabel: "Épidémiologue · MSAS"   },
  "i.ndiaye@ird.sn":         { name: "Ibrahim Ndiaye",     role: "researcher",     roleLabel: "Chercheur · IRD"        },
  "f.cisse@pasteur.sn":      { name: "Dr. Fatou Cissé",    role: "epidemiologist", roleLabel: "Épidémiologue · Pasteur"},
  "m.sarr@msas.gouv.sn":     { name: "Moussa Sarr",        role: "reader",         roleLabel: "Lecteur · MSAS"         },
  "c.ba@who.int":            { name: "Dr. Cheikh Ba",      role: "researcher",     roleLabel: "Chercheur · OMS"        },
  "r.faye@msas.gouv.sn":     { name: "Rokhaya Faye",       role: "reader",         roleLabel: "Lecteur · MSAS"         },
  "o.dieng@ucad.edu.sn":     { name: "Dr. Omar Dieng",     role: "researcher",     roleLabel: "Chercheur · UCAD"       },
};

interface AuthPageProps {
  onAuthSuccess: (user: { name: string; email: string; role: Role; roleLabel: string }) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleToggle = () => {
    setIsLogin(!isLogin);
    // Reset validation/error/fields
    setEmail("");
    setPassword("");
    setName("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Veuillez saisir votre adresse email.");
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Format d'adresse email invalide.");
      return;
    }

    if (!password) {
      toast.error("Veuillez saisir votre mot de passe.");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (!isLogin) {
      if (!name) {
        toast.error("Veuillez saisir votre nom complet.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Les mots de passe ne correspondent pas.");
        return;
      }
      if (!agreeTerms) {
        toast.error("Veuillez accepter les conditions d'utilisation.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (!isLogin) await apiRegister(email, password, name);
      const token = await apiLogin(email, password);
      setToken(token);
      const me = await getMe();
      const { role, roleLabel } = mapBackendRole(me.role);
      const userProfile = {
        name:      me.nom_complet ?? me.email,
        email:     me.email,
        role:      role as Role,
        roleLabel,
      };
      toast.success(isLogin ? `Ravi de vous revoir, ${userProfile.name} !` : "Compte créé avec succès ! Bienvenue chez Faypal.");
      onAuthSuccess(userProfile);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockOAuth = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const known = KNOWN_USERS["mamadou.sy@msas.gouv.sn"];
      const userProfile = { name: known.name, email: "mamadou.sy@msas.gouv.sn", role: known.role, roleLabel: known.roleLabel };
      toast.success(`Connecté via ${provider} en tant que ${userProfile.name}`);
      onAuthSuccess(userProfile);
    }, 800);
  };

  return (
    <div className="flex min-h-screen w-full select-none overflow-hidden bg-background text-foreground">
      {/* ── Left Column: Visual Showcase (hidden on mobile/small tablets) ────────────────── */}
      <div 
        className="relative hidden w-[45%] flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{ 
          backgroundColor: "#0A1628", 
          borderRight: "1px solid rgba(255, 255, 255, 0.05)" 
        }}
      >
        {/* Subtle Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        />

        {/* Ambient Glows */}
        <div className="absolute top-[20%] left-[-10%] h-[350px] w-[350px] rounded-full bg-[#1A56DB] opacity-[0.25] blur-[120px] animate-pulse duration-[6s]" />
        <div className="absolute bottom-[10%] right-[-10%] h-[350px] w-[350px] rounded-full bg-[#0D9488] opacity-[0.25] blur-[120px] animate-pulse duration-[8s]" />

        {/* Brand Header */}
        <div className="relative flex items-center gap-3">
          <img 
            src={logoIcon} 
            alt="Faypal Logo" 
            className="h-10 w-10 object-cover rounded-xl shadow-[0_0_20px_rgba(26,86,219,0.3)] border border-white/10" 
          />
          <div>
            <div className="font-bold text-white text-lg tracking-tight flex items-center gap-1.5" style={{ fontFamily: "var(--font-family-display)" }}>
              Fay<span className="text-[#0D9488]">pal</span>
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                SaaS
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Health Intelligence</p>
          </div>
        </div>

        {/* Animated Marketing Content / Floating Cards */}
        <div className="relative my-auto flex flex-col gap-6 max-w-sm">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
              <Sparkles size={12} className="animate-spin duration-[4s]" />
              Intelligence Épidémiologique
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white leading-tight" style={{ fontFamily: "var(--font-family-display)" }}>
              Prédire et prévenir les épidémies en temps réel.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Faypal centralise les données climatiques et les captures vectorielles MoustiBox pour cartographier les zones à risque avec une précision chirurgicale.
            </p>
          </div>

          {/* Floating UI Card 1: Vector Alerts */}
          <div className="group rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05] shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <Activity size={14} />
                </div>
                <span className="font-bold text-white text-xs">Alerte Vectorielle</span>
              </div>
              <span className="rounded-full bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                CRITIQUE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal mb-1">
              Suractivation d&apos;Anopheles gambiae détectée dans le secteur de <strong className="text-white">Kédougou</strong>.
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
              <span>Captures : +47 vectoriels</span>
              <span>Il y a 2 min</span>
            </div>
          </div>

          {/* Floating UI Card 2: AI Accuracy Indicator */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md p-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05] shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Cpu size={14} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-white">Précision Modèle IA</p>
                <p className="text-[9px] text-slate-500">Mise à jour v2.4.1</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-[#0D9488]">94.3%</span>
              <p className="text-[9px] text-[#0D9488] font-semibold flex items-center gap-0.5 justify-end">
                <ShieldCheck size={9} /> Validé
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>© 2026 Faypal Health</span>
          <span className="flex items-center gap-1">
            <Globe size={11} /> MSAS · Sénégal
          </span>
        </div>
      </div>

      {/* ── Right Column: Interactive Forms ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 md:px-20 lg:px-24 bg-[#F0F4F8] dark:bg-background relative">
        {/* Floating gradient circles on light background */}
        <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-blue-400/10 dark:bg-[#1A56DB]/5 blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-teal-400/10 dark:bg-[#0D9488]/5 blur-[80px]" />

        <div className="mx-auto w-full max-w-md space-y-6 relative z-10">
          
          {/* Logo visible only on mobile/tablet */}
          <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <img 
              src={logoIcon} 
              alt="Faypal Logo" 
              className="h-9 w-9 object-cover rounded-lg border border-slate-300 dark:border-slate-800" 
            />
            <div>
              <span className="font-bold text-foreground text-base tracking-tight" style={{ fontFamily: "var(--font-family-display)" }}>
                Fay<span className="text-[#0D9488]">pal</span>
              </span>
              <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Health Intelligence</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-family-display)" }}>
              {isLogin ? "Connexion à votre espace" : "Créer un compte administrateur"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isLogin 
                ? "Saisissez vos identifiants pour accéder au tableau de bord." 
                : "Enregistrez votre profil pour commencer le suivi épidémiologique."
              }
            </p>
          </div>

          {/* Login / Register Tab Slider pill */}
          <div className="p-1 rounded-lg bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/30 dark:border-slate-800/40 flex w-full relative">
            <button
              type="button"
              onClick={() => { if (!isLogin) handleToggle(); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                isLogin 
                  ? "bg-white dark:bg-slate-800 text-foreground shadow-sm font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => { if (isLogin) handleToggle(); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                !isLogin 
                  ? "bg-white dark:bg-slate-800 text-foreground shadow-sm font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Créer un compte
            </button>
          </div>

          {/* Actual Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* Full Name field (Register only) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <User size={13} className="text-muted-foreground" /> Nom complet
                </label>
                <Input
                  type="text"
                  placeholder="Dr. Amadou Diallo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="bg-white dark:bg-slate-900/50"
                />
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                <Mail size={13} className="text-muted-foreground" /> Adresse email
              </label>
              <Input
                type="email"
                placeholder="mamadou.sy@msas.gouv.sn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="bg-white dark:bg-slate-900/50"
              />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Lock size={13} className="text-muted-foreground" /> Mot de passe
                </label>
                {isLogin && (
                  <button 
                    type="button"
                    onClick={() => toast.info("Mock: Réinitialisation envoyée à votre email.")}
                    className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-white dark:bg-slate-900/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Lock size={13} className="text-muted-foreground" /> Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-white dark:bg-slate-900/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me / Agree terms */}
            <div className="flex items-center justify-between py-1">
              {isLogin ? (
                <div className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe} 
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                  />
                  <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none font-medium">
                    Se souvenir de moi
                  </label>
                </div>
              ) : (
                <div className="flex items-start gap-2 cursor-pointer">
                  <Checkbox 
                    id="agree" 
                    checked={agreeTerms} 
                    onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="agree" className="text-xs text-muted-foreground cursor-pointer select-none font-medium leading-tight">
                    J&apos;accepte les <button type="button" onClick={() => toast.info("Mock: Conditions d'utilisation ouvertes.")} className="text-primary hover:underline font-semibold">Conditions d&apos;utilisation</button> et la <button type="button" onClick={() => toast.info("Mock: Politique de confidentialité ouverte.")} className="text-primary hover:underline font-semibold">Politique de confidentialité</button>.
                  </label>
                </div>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 font-semibold text-white tracking-wide transition-all cursor-pointer relative shadow-lg shadow-primary/15"
              style={{
                background: "linear-gradient(135deg, #1A56DB, #0D9488)",
                border: "none",
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Traitement en cours...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  {isLogin ? "Se connecter" : "Créer le compte"}
                  <ArrowRight size={14} />
                </span>
              )}
            </Button>

          </form>



          {/* Terms info for Login */}
          {isLogin && (
            <p className="text-center text-[10px] text-muted-foreground leading-normal">
              En vous connectant, vous acceptez nos <button type="button" onClick={() => toast.info("Mock: Conditions d'utilisation ouvertes.")} className="text-primary hover:underline font-semibold">Conditions d&apos;utilisation</button> et notre <button type="button" onClick={() => toast.info("Mock: Politique de confidentialité ouverte.")} className="text-primary hover:underline font-semibold">Politique de confidentialité</button>.
            </p>
          )}

        </div>
      </div>
    </div>
  );
}

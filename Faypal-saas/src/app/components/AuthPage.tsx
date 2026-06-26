import React, { useState, useRef } from "react";
import { login as apiLogin, initiateRegistration, verifyRegistration, getMe, setToken, mapBackendRole } from "../lib/api";
import {
  Mail, Lock, User, Eye, EyeOff, Sparkles,
  ArrowRight, ShieldCheck, KeyRound,
  Activity, Cpu, Globe
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import logoIcon from "../../imports/ICONE_SECONDAIRE.jpg";

type Role = "admin" | "epidemiologist" | "researcher" | "reader";
type Step = "login" | "register" | "verify";

interface AuthPageProps {
  onAuthSuccess: (user: { name: string; email: string; role: Role; roleLabel: string }) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [step, setStep] = useState<Step>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Verify step
  const [pendingEmail, setPendingEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetForm = () => {
    setEmail(""); setPassword(""); setName(""); setConfirmPassword("");
    setShowPassword(false); setShowConfirmPassword(false);
    setDigits(["", "", "", "", "", ""]);
  };

  const handleTabSwitch = (target: Step) => {
    if (step === target) return;
    resetForm();
    setStep(target);
  };

  // ── Login / Register submit ───────────────────────────────────────────────

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Adresse email invalide."); return;
    }
    if (!password) { toast.error("Veuillez saisir votre mot de passe."); return; }

    if (step === "register") {
      if (password.length < 8) { toast.error("Mot de passe trop court (8 caractères min)."); return; }
      if (!name)                { toast.error("Veuillez saisir votre nom complet."); return; }
      if (password !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas."); return; }
      if (!agreeTerms)          { toast.error("Veuillez accepter les conditions d'utilisation."); return; }
    } else {
      if (password.length < 6)  { toast.error("Mot de passe trop court."); return; }
    }

    setIsLoading(true);
    try {
      if (step === "register") {
        await initiateRegistration(email, password, name);
        setPendingEmail(email);
        toast.success("Code envoyé ! Vérifiez votre boîte email.");
        setStep("verify");
      } else {
        const token = await apiLogin(email, password);
        setToken(token);
        const me = await getMe();
        const { role, roleLabel } = mapBackendRole(me.role);
        toast.success(`Ravi de vous revoir, ${me.nom_complet ?? me.email} !`);
        onAuthSuccess({ name: me.nom_complet ?? me.email, email: me.email, role: role as Role, roleLabel });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verify code submit ────────────────────────────────────────────────────

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) { toast.error("Veuillez saisir les 6 chiffres."); return; }

    setIsLoading(true);
    try {
      const res = await verifyRegistration(pendingEmail, code);
      setToken(res.access_token);
      const { role, roleLabel } = mapBackendRole(res.user.role);
      toast.success("Compte activé ! Bienvenue chez Faypal.");
      onAuthSuccess({ name: res.user.nom_complet ?? res.user.email, email: res.user.email, role: role as Role, roleLabel });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Code invalide");
      setDigits(["", "", "", "", "", ""]);
      digitRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (idx: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < 5) digitRefs.current[idx + 1]?.focus();
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      await initiateRegistration(pendingEmail, password, name);
      toast.success("Nouveau code envoyé !");
      setDigits(["", "", "", "", "", ""]);
      digitRefs.current[0]?.focus();
    } catch {
      toast.error("Impossible de renvoyer le code.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen w-full select-none overflow-hidden bg-background text-foreground">

      {/* ── Left column ─────────────────────────────────────────────────────── */}
      <div
        className="relative hidden w-[45%] flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{ backgroundColor: "#0A1628", borderRight: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute top-[20%] left-[-10%] h-[350px] w-[350px] rounded-full bg-[#1A56DB] opacity-[0.25] blur-[120px] animate-pulse duration-[6s]" />
        <div className="absolute bottom-[10%] right-[-10%] h-[350px] w-[350px] rounded-full bg-[#0D9488] opacity-[0.25] blur-[120px] animate-pulse duration-[8s]" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <img src={logoIcon} alt="Faypal Logo" className="h-10 w-10 object-cover rounded-xl shadow-[0_0_20px_rgba(26,86,219,0.3)] border border-white/10" />
          <div>
            <div className="font-bold text-white text-lg tracking-tight flex items-center gap-1.5" style={{ fontFamily: "var(--font-family-display)" }}>
              Fay<span className="text-[#0D9488]">pal</span>
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 uppercase tracking-widest">SaaS</span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Health Intelligence</p>
          </div>
        </div>

        {/* Marketing */}
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

          <div className="group rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <Activity size={14} />
                </div>
                <span className="font-bold text-white text-xs">Alerte Vectorielle</span>
              </div>
              <span className="rounded-full bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-400">CRITIQUE</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal mb-1">
              Suractivation d&apos;Anopheles gambiae détectée dans le secteur de <strong className="text-white">Kédougou</strong>.
            </p>
            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
              <span>Captures : +47 vectoriels</span><span>Il y a 2 min</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md p-3 shadow-lg">
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

        <div className="relative flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>© 2026 Faypal Health</span>
          <span className="flex items-center gap-1"><Globe size={11} /> MSAS · Sénégal</span>
        </div>
      </div>

      {/* ── Right column ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 md:px-20 lg:px-24 bg-[#F0F4F8] dark:bg-background relative">
        <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-blue-400/10 dark:bg-[#1A56DB]/5 blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-teal-400/10 dark:bg-[#0D9488]/5 blur-[80px]" />

        <div className="mx-auto w-full max-w-md space-y-6 relative z-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <img src={logoIcon} alt="Faypal Logo" className="h-9 w-9 object-cover rounded-lg border border-slate-300 dark:border-slate-800" />
            <div>
              <span className="font-bold text-foreground text-base tracking-tight" style={{ fontFamily: "var(--font-family-display)" }}>
                Fay<span className="text-[#0D9488]">pal</span>
              </span>
              <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Health Intelligence</p>
            </div>
          </div>

          {/* ── VERIFY STEP ─────────────────────────────────────────────────── */}
          {step === "verify" ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <KeyRound size={18} />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-family-display)" }}>
                    Vérification email
                  </h1>
                </div>
                <p className="text-muted-foreground text-sm">
                  Un code à 6 chiffres a été envoyé à{" "}
                  <span className="font-semibold text-foreground">{pendingEmail}</span>.
                  Saisissez-le ci-dessous (valable 10 min).
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-6">
                {/* 6-digit code input */}
                <div className="flex justify-center gap-3">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { digitRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(i, e)}
                      disabled={isLoading}
                      className="h-14 w-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-2xl font-bold text-foreground tracking-widest outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || digits.join("").length < 6}
                  className="w-full h-10 font-semibold text-white tracking-wide shadow-lg shadow-primary/15"
                  style={{ background: "linear-gradient(135deg,#1A56DB,#0D9488)", border: "none" }}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Vérification...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Confirmer mon compte <ArrowRight size={14} />
                    </span>
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <button type="button" onClick={() => { resetForm(); setStep("register"); }} className="hover:text-foreground font-medium transition-colors cursor-pointer">
                  ← Modifier l&apos;email
                </button>
                <button type="button" onClick={handleResendCode} disabled={isLoading} className="text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50">
                  Renvoyer le code
                </button>
              </div>
            </>
          ) : (
            <>
              {/* ── LOGIN / REGISTER STEP ──────────────────────────────────── */}
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-family-display)" }}>
                  {step === "login" ? "Connexion à votre espace" : "Créer un compte"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {step === "login"
                    ? "Saisissez vos identifiants pour accéder au tableau de bord."
                    : "Enregistrez votre profil pour commencer le suivi épidémiologique."}
                </p>
              </div>

              {/* Tab switcher */}
              <div className="p-1 rounded-lg bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/30 dark:border-slate-800/40 flex w-full">
                <button type="button" onClick={() => handleTabSwitch("login")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${step === "login" ? "bg-white dark:bg-slate-800 text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"}`}>
                  Se connecter
                </button>
                <button type="button" onClick={() => handleTabSwitch("register")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${step === "register" ? "bg-white dark:bg-slate-800 text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"}`}>
                  Créer un compte
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {step === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                      <User size={13} className="text-muted-foreground" /> Nom complet
                    </label>
                    <Input type="text" placeholder="Dr. Amadou Diallo" value={name}
                      onChange={e => setName(e.target.value)} disabled={isLoading}
                      className="bg-white dark:bg-slate-900/50" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Mail size={13} className="text-muted-foreground" /> Adresse email
                  </label>
                  <Input type="email" placeholder="mamadou.sy@msas.gouv.sn" value={email}
                    onChange={e => setEmail(e.target.value)} disabled={isLoading}
                    className="bg-white dark:bg-slate-900/50" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                      <Lock size={13} className="text-muted-foreground" /> Mot de passe
                    </label>
                    {step === "login" && (
                      <button type="button" onClick={() => toast.info("Réinitialisation envoyée à votre email.")}
                        className="text-[11px] text-primary hover:underline font-semibold cursor-pointer">
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                      onChange={e => setPassword(e.target.value)} disabled={isLoading}
                      className="bg-white dark:bg-slate-900/50 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {step === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                      <Lock size={13} className="text-muted-foreground" /> Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading}
                        className="bg-white dark:bg-slate-900/50 pr-10" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between py-1">
                  {step === "login" ? (
                    <div className="flex items-center gap-2 cursor-pointer">
                      <Checkbox id="remember" checked={rememberMe} onCheckedChange={c => setRememberMe(!!c)} />
                      <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none font-medium">
                        Se souvenir de moi
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 cursor-pointer">
                      <Checkbox id="agree" checked={agreeTerms} onCheckedChange={c => setAgreeTerms(!!c)} className="mt-0.5" />
                      <label htmlFor="agree" className="text-xs text-muted-foreground cursor-pointer select-none font-medium leading-tight">
                        J&apos;accepte les{" "}
                        <button type="button" onClick={() => toast.info("Conditions d'utilisation.")} className="text-primary hover:underline font-semibold">Conditions d&apos;utilisation</button>
                        {" "}et la{" "}
                        <button type="button" onClick={() => toast.info("Politique de confidentialité.")} className="text-primary hover:underline font-semibold">Politique de confidentialité</button>.
                      </label>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={isLoading}
                  className="w-full h-10 font-semibold text-white tracking-wide shadow-lg shadow-primary/15"
                  style={{ background: "linear-gradient(135deg,#1A56DB,#0D9488)", border: "none" }}>
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{step === "register" ? "Envoi du code..." : "Connexion..."}</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      {step === "login" ? "Se connecter" : "Recevoir le code de vérification"}
                      <ArrowRight size={14} />
                    </span>
                  )}
                </Button>
              </form>

              {step === "login" && (
                <p className="text-center text-[10px] text-muted-foreground leading-normal">
                  En vous connectant, vous acceptez nos{" "}
                  <button type="button" onClick={() => toast.info("Conditions d'utilisation.")} className="text-primary hover:underline font-semibold">Conditions d&apos;utilisation</button>
                  {" "}et notre{" "}
                  <button type="button" onClick={() => toast.info("Politique de confidentialité.")} className="text-primary hover:underline font-semibold">Politique de confidentialité</button>.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

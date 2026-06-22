import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PulseGridLogo from "@/components/PulseGridLogo";
import { useAuth } from "@/contexts/AuthContext";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { handleSignUp, error, clearError } = useAuth();
  const navigate = useNavigate();

  const getStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strength = getStrength(password);
  const strengthColors = ["bg-destructive", "bg-destructive", "bg-warning", "bg-accent", "bg-success"];
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) return;
    if (!agreed) return;
    try {
      setSubmitting(true);
      await handleSignUp(email, password, name);
      navigate("/app/projects", { replace: true });
    } catch {
      // Error is already set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md glass rounded-2xl p-8 card-shadow">
          <div className="lg:hidden mb-8">
            <PulseGridLogo />
          </div>
          <h1 className="text-2xl font-bold mb-2">Créez votre compte</h1>
          <p className="text-muted-foreground text-body mb-8">Construisez votre centre de pilotage.</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {error}
              <button onClick={clearError} className="float-right text-destructive/60 hover:text-destructive">✕</button>
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-micro block mb-2">NOM COMPLET</label>
              <input
                type="text"
                placeholder="Jean Dupont"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-micro block mb-2">E-MAIL</label>
              <input
                type="email"
                placeholder="vous@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-micro block mb-2">MOT DE PASSE</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {password && (
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? strengthColors[strength] : "bg-muted"}`} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-micro block mb-2">CONFIRMER LE MOT DE PASSE</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-4 py-2.5 bg-muted/50 border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${!passwordsMatch ? "border-destructive" : "border-border"
                  }`}
              />
              {!passwordsMatch && (
                <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-body text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="rounded border-border bg-muted accent-primary"
              />
              J'accepte les conditions d'utilisation
            </label>

            <button
              type="submit"
              disabled={submitting || !agreed || !passwordsMatch || !password}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Création du compte…" : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">Aucune carte bancaire requise. Offre gratuite à vie disponible.</p>

          <p className="text-center text-body text-muted-foreground mt-6">
            Vous avez déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>

      {/* Right - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-card relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-8 right-8">
          <PulseGridLogo />
        </div>

        {/* Mini widget grid */}
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          {[
            { label: "Monthly Revenue", value: "$48,290", color: "border-l-primary" },
            { label: "Active Users", value: "1,204", color: "border-l-accent" },
            { label: "Growth Rate", value: "+12.4%", color: "border-l-success" },
            { label: "Avg Session", value: "4m 32s", color: "border-l-info" },
          ].map((w, i) => (
            <div key={i} className={`glass rounded-xl p-4 card-shadow border-l-2 ${w.color} animate-float`} style={{ animationDelay: `${i * 0.4}s` }}>
              <p className="text-micro mb-1">{w.label}</p>
              <p className="text-xl font-bold">{w.value}</p>
            </div>
          ))}
          {/* Mini chart placeholders */}
          <div className="col-span-2 glass rounded-xl p-4 card-shadow h-32 flex items-end gap-1">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
              <div key={i} className="flex-1 bg-primary/40 rounded-t-sm transition-all" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default Signup;

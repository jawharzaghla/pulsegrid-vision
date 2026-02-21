import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { TrendingUp, Users, Target } from "lucide-react";
import PulseGridLogo from "@/components/PulseGridLogo";
import { useAuth } from "@/contexts/AuthContext";

const mockKPIs = [
  { label: "Revenue", value: "$48,290", change: "↑ 12%", icon: TrendingUp },
  { label: "Active Users", value: "1,204", change: "↑ 8.1%", icon: Users },
  { label: "Conversion", value: "3.8%", change: "↑ 0.4%", icon: Target },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { handleSignIn, handleGoogleSignIn, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/app/projects";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setSubmitting(true);
      await handleSignIn(email, password);
      navigate(from, { replace: true });
    } catch {
      // Error is already set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleSignIn = async () => {
    try {
      setSubmitting(true);
      await handleGoogleSignIn();
      navigate(from, { replace: true });
    } catch {
      // Error is already set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-card relative flex-col items-center justify-center p-12">
        <div className="absolute top-8 left-8">
          <PulseGridLogo />
        </div>

        <p className="text-2xl italic text-muted-foreground mb-12 max-w-sm text-center">
          "Your businesses, one heartbeat."
        </p>

        <div className="space-y-4 w-full max-w-xs">
          {mockKPIs.map((kpi, i) => (
            <div
              key={i}
              className={`glass rounded-xl p-4 card-shadow ${i === 0 ? "animate-float" : i === 1 ? "animate-float-delayed" : "animate-float-delayed-2"
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-micro mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <kpi.icon size={18} className="text-accent" />
                  <span className="text-xs text-success font-medium">{kpi.change}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md glass rounded-2xl p-8 card-shadow">
          <div className="lg:hidden mb-8">
            <PulseGridLogo />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-body mb-8">Sign in to your workspace.</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {error}
              <button onClick={clearError} className="float-right text-destructive/60 hover:text-destructive">✕</button>
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-micro block mb-2">EMAIL</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-micro block mb-2">PASSWORD</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="text-right">
              <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-micro">OR CONTINUE WITH</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={onGoogleSignIn}
            disabled={submitting}
            className="w-full py-2.5 border border-border hover:border-primary/50 rounded-lg text-body font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <p className="text-center text-body text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">Start free</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

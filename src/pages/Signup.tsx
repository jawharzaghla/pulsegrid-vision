import { Link } from "react-router-dom";
import { useState } from "react";
import PulseGridLogo from "@/components/PulseGridLogo";

const Signup = () => {
  const [password, setPassword] = useState("");

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

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md glass rounded-2xl p-8 card-shadow">
          <div className="lg:hidden mb-8">
            <PulseGridLogo />
          </div>
          <h1 className="text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-muted-foreground text-body mb-8">Start building your command center.</p>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-micro block mb-2">FULL NAME</label>
              <input type="text" placeholder="Jane Doe" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-micro block mb-2">EMAIL</label>
              <input type="email" placeholder="you@company.com" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-micro block mb-2">PASSWORD</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              {password && (
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? strengthColors[strength] : "bg-muted"}`} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-micro block mb-2">CONFIRM PASSWORD</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>

            <label className="flex items-center gap-2 text-body text-muted-foreground">
              <input type="checkbox" className="rounded border-border bg-muted" />
              I agree to the Terms of Service
            </label>

            <button type="submit" className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all">
              Create Account
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">No credit card required. Free forever plan available.</p>

          <p className="text-center text-body text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
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

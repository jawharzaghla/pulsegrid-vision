import { useState } from "react";

const AccountSettings = () => {
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

  const invoices = [
    { date: "Feb 1, 2026", amount: "$19.00", status: "Paid" },
    { date: "Jan 1, 2026", amount: "$19.00", status: "Paid" },
    { date: "Dec 1, 2025", amount: "$19.00", status: "Paid" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-8">Account & Billing</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left - Account */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 card-shadow">
            <h3 className="font-semibold mb-4">Profile</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground cursor-pointer hover:opacity-80 transition-opacity">
                JD
              </div>
              <div>
                <p className="font-medium">Jane Doe</p>
                <p className="text-xs text-muted-foreground">Click avatar to upload</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-micro block mb-2">NAME</label>
                <input defaultValue="Jane Doe" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <label className="text-micro block mb-2">EMAIL</label>
                <input defaultValue="jane@company.com" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <button className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all">Save Profile</button>
            </div>
          </div>

          <div className="glass rounded-xl p-6 card-shadow">
            <h3 className="font-semibold mb-4">Password</h3>
            <div className="space-y-4">
              <div>
                <label className="text-micro block mb-2">CURRENT PASSWORD</label>
                <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <label className="text-micro block mb-2">NEW PASSWORD</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
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
              <button className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all">Update Password</button>
            </div>
          </div>
        </div>

        {/* Right - Billing */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Current Plan</h3>
              <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-full">Pro</span>
            </div>
            <p className="text-body text-muted-foreground mb-6">Next billing: March 1, 2026</p>

            <div className="space-y-4">
              {[
                { label: "Projects", used: 7, total: 10 },
                { label: "Widgets", used: 63, total: 250 },
                { label: "AI Analyses Today", used: 12, total: 100 },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-medium">{stat.used}/{stat.total}</span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div className="h-full gradient-primary rounded-full" style={{ width: `${(stat.used / stat.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade card */}
          <div className="gradient-border rounded-xl p-6 bg-card card-shadow">
            <h3 className="font-semibold mb-2">Upgrade to Business</h3>
            <p className="text-body text-muted-foreground mb-4">Unlimited everything. Priority support. SSO & team roles.</p>
            <button className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all">
              Upgrade — $49/mo
            </button>
          </div>

          {/* Invoices */}
          <div className="glass rounded-xl p-6 card-shadow">
            <h3 className="font-semibold mb-4">Invoices</h3>
            <table className="w-full text-body">
              <thead>
                <tr className="text-micro text-left">
                  <th className="pb-2">DATE</th>
                  <th className="pb-2">AMOUNT</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                    <td className="py-2 px-1 rounded-l-md">{inv.date}</td>
                    <td className="py-2">{inv.amount}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">{inv.status}</span>
                    </td>
                    <td className="py-2 px-1 text-right rounded-r-md">
                      <a href="#" className="text-primary text-xs hover:underline">Download</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;

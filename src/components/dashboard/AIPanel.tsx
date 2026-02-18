import { useState } from "react";
import { X, Sparkles, RefreshCw, Copy, AlertTriangle, Send } from "lucide-react";

const tabs = ["Project Brief", "Widget Analysis", "Ask a Question", "Daily Brief"];

const mockChat = [
  { role: "user" as const, text: "What's driving our revenue growth this month?" },
  { role: "ai" as const, text: "Your revenue growth of 12.4% this month is primarily driven by a 22.7% increase in API Add-on purchases and a 14.2% uplift in Pro Plan subscriptions. Organic traffic is your strongest channel, contributing 35% of new conversions." },
  { role: "user" as const, text: "Any concerns I should watch for?" },
  { role: "ai" as const, text: "I've detected a churn spike in Week 11 — a 0.8% increase above your 90-day average. This correlates with a pricing page change deployed on March 14. I'd recommend running a cohort analysis on users who viewed the pricing page that week." },
];

const AIPanel = ({ onClose }: { onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
      <div className="relative w-[500px] h-full glass-strong border-l border-border/50 animate-slide-in-right overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-accent" />
              <h2 className="text-xl font-bold">AI Analysis</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <p className="text-xs text-muted-foreground mb-6">Generated just now</p>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted/30 rounded-lg p-1">
            {tabs.map((t, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  i === activeTab ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Project Brief */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <p className="text-body leading-relaxed">
                <strong>Overall:</strong> Your SaaS metrics show strong momentum this period. Revenue is up 12.4% MoM to $48,290, with MRR growth accelerating. User acquisition is healthy at 1,204 active users, though there are early signs of elevated churn worth monitoring.
              </p>

              {/* Collapsible sections */}
              {[
                { title: "Revenue Insights", color: "border-l-success", content: "Subscription revenue grew 14.2% driven by Pro Plan upgrades. One-time purchases declined 3.1%. Consider promoting annual plans to stabilize recurring revenue. API Add-on is your fastest growing segment at +22.7%." },
                { title: "User Growth", color: "border-l-info", content: "Net new users increased 8.1% MoM. Organic remains your strongest channel at 35% of signups. Paid acquisition CPA decreased 12% — consider increasing budget allocation. Referral program shows early promise with 15% of new users." },
                { title: "Anomalies Detected", color: "border-l-warning", content: "Churn spiked 0.8% above average in Week 11, correlating with a pricing page redesign deployed March 14. Recommend cohort analysis on affected users.", isAnomaly: true },
              ].map((section, i) => (
                <div key={i} className={`border-l-2 ${section.color} pl-4 py-2`}>
                  <h4 className="font-semibold text-sm mb-2">{section.title}</h4>
                  {section.isAnomaly && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-warning/10 border border-warning/20 rounded-md w-fit">
                      <AlertTriangle size={12} className="text-warning" />
                      <span className="text-xs text-warning font-medium">Churn spike detected Week 11</span>
                    </div>
                  )}
                  <p className="text-body text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <button className="px-4 py-2 border border-border hover:border-primary/50 rounded-lg text-body text-muted-foreground hover:text-foreground transition-all flex items-center gap-2">
                  <RefreshCw size={14} /> Regenerate
                </button>
                <button className="px-4 py-2 border border-border hover:border-primary/50 rounded-lg text-body text-muted-foreground hover:text-foreground transition-all flex items-center gap-2">
                  <Copy size={14} /> Copy Report
                </button>
              </div>
            </div>
          )}

          {/* Ask a Question */}
          {activeTab === 2 && (
            <div className="flex flex-col h-[calc(100vh-220px)]">
              <div className="flex-1 space-y-4 overflow-y-auto mb-4">
                {mockChat.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-body leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/50 border border-border rounded-bl-md"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="Ask anything about your data..."
                  className="flex-1 px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <button className="w-10 h-10 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg flex items-center justify-center transition-all">
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Widget Analysis placeholder */}
          {activeTab === 1 && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles size={32} className="mx-auto mb-4 text-accent/40" />
              <p className="text-body">Select a widget on your dashboard to get AI-powered insights about that specific data source.</p>
            </div>
          )}

          {/* Daily Brief placeholder */}
          {activeTab === 3 && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles size={32} className="mx-auto mb-4 text-accent/40" />
              <p className="text-body">Your daily brief will be ready at 9:00 AM tomorrow. It summarizes overnight changes and key metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIPanel;

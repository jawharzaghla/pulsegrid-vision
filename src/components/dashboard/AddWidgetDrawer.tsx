import { useState } from "react";
import { X, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity, Gauge, Table, TrendingUp, CircleDot, CheckCircle } from "lucide-react";

const steps = ["Name & Endpoint", "Map Your Data", "Visualization", "Display Options"];

const vizTypes = [
  { icon: TrendingUp, label: "KPI Card" },
  { icon: LineChartIcon, label: "Line Chart" },
  { icon: BarChart3, label: "Bar Chart" },
  { icon: PieChartIcon, label: "Donut Chart" },
  { icon: Activity, label: "Area Chart" },
  { icon: Gauge, label: "Gauge" },
  { icon: Table, label: "Data Table" },
  { icon: CircleDot, label: "Sparkline" },
  { icon: CheckCircle, label: "Status" },
];

const palettes = [
  ["#7B2FBE", "#9B59B6", "#00C9A7", "#3498DB"],
  ["#E74C3C", "#E67E22", "#F1C40F", "#2ECC71"],
  ["#1ABC9C", "#3498DB", "#9B59B6", "#E74C3C"],
  ["#2C3E50", "#7F8C8D", "#BDC3C7", "#ECF0F1"],
  ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
  ["#6C5CE7", "#A29BFE", "#FD79A8", "#FDCB6E"],
];

const AddWidgetDrawer = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(0);
  const [selectedViz, setSelectedViz] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
      <div className="relative w-[400px] h-full glass-strong border-l border-border/50 animate-slide-in-right overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold">Add Widget</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>

          {/* Stepper */}
          <div className="flex gap-2 mb-8">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`flex-1 text-center pb-2 border-b-2 transition-all text-xs ${
                  i === step ? "border-primary text-foreground font-medium" : "border-border text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Step content */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-micro block mb-2">WIDGET NAME</label>
                <input placeholder="e.g. Monthly Revenue" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <label className="text-micro block mb-2">API ENDPOINT URL</label>
                <input placeholder="https://api.example.com/data" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div>
                <label className="text-micro block mb-2">AUTH METHOD</label>
                <select className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
                  <option>None</option>
                  <option>API Key</option>
                  <option>Bearer Token</option>
                  <option>Basic Auth</option>
                </select>
              </div>
              <button className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent rounded-lg text-body font-medium transition-all hover:bg-accent/20">
                Fetch Preview
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs overflow-auto max-h-60 border border-border/50">
                <div className="text-muted-foreground">{'{'}</div>
                <div className="ml-4"><span className="text-info">"data"</span>: {'{'}</div>
                <div className="ml-8"><span className="text-info">"revenue"</span>: {'{'}</div>
                <div className="ml-12 text-accent hover:bg-primary/10 cursor-pointer rounded px-1">"total": <span className="text-warning">48290</span>,</div>
                <div className="ml-12 text-accent hover:bg-primary/10 cursor-pointer rounded px-1">"growth": <span className="text-warning">12.4</span>,</div>
                <div className="ml-12 text-accent hover:bg-primary/10 cursor-pointer rounded px-1">"currency": <span className="text-success">"USD"</span></div>
                <div className="ml-8">{'}'}</div>
                <div className="ml-4">{'}'}</div>
                <div className="text-muted-foreground">{'}'}</div>
              </div>
              <div>
                <label className="text-micro block mb-2">PRIMARY VALUE</label>
                <input value="data.revenue.total" readOnly className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body font-mono text-primary focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-micro block mb-2">LABEL FIELD (OPTIONAL)</label>
                <input placeholder="Select a field..." className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-3 gap-3">
              {vizTypes.map((vt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedViz(i)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    i === selectedViz ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-primary/40"
                  }`}
                >
                  <vt.icon size={20} className={i === selectedViz ? "text-primary" : "text-muted-foreground"} />
                  <span className="text-[11px] text-muted-foreground">{vt.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-micro block mb-2">UNIT PREFIX</label>
                  <input placeholder="$" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
                <div>
                  <label className="text-micro block mb-2">UNIT SUFFIX</label>
                  <input placeholder="%" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-micro block mb-2">DECIMAL PLACES</label>
                <div className="flex items-center gap-3">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <button key={n} className="w-10 h-10 rounded-lg border border-border bg-muted/50 text-body hover:border-primary/50 transition-all">
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-micro block mb-2">REFRESH INTERVAL</label>
                <select className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
                  <option>Every 30 seconds</option>
                  <option>Every 1 minute</option>
                  <option>Every 5 minutes</option>
                  <option>Every 15 minutes</option>
                  <option>Manual only</option>
                </select>
              </div>
              <div>
                <label className="text-micro block mb-2">COLOR PALETTE</label>
                <div className="grid grid-cols-3 gap-2">
                  {palettes.map((p, i) => (
                    <button key={i} className="flex gap-0.5 p-2 rounded-lg border border-border bg-muted/20 hover:border-primary/50 transition-all">
                      {p.map((c, j) => (
                        <div key={j} className="flex-1 h-4 rounded-sm" style={{ background: c }} />
                      ))}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 py-3 border border-border hover:border-primary/50 rounded-lg text-body font-medium transition-all">
                Back
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all">
                Next
              </button>
            ) : (
              <button onClick={onClose} className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all">
                Add to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddWidgetDrawer;

import { useState } from "react";
import { X, ArrowRight, ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { addWidget } from "@/services/firestore.service";
import type { Widget, VisualizationType } from "@/types/models";

interface AddWidgetDrawerProps {
  projectId: string;
  onClose: () => void;
  onWidgetAdded: () => void;
}

const vizTypes: { type: VisualizationType; label: string; icon: string }[] = [
  { type: "kpi-card", label: "KPI Card", icon: "📊" },
  { type: "line-chart", label: "Line Chart", icon: "📈" },
  { type: "bar-chart", label: "Bar Chart", icon: "📶" },
  { type: "area-chart", label: "Area Chart", icon: "🏔️" },
  { type: "donut-chart", label: "Donut Chart", icon: "🍩" },
  { type: "data-table", label: "Data Table", icon: "📋" },
  { type: "sparkline", label: "Sparkline", icon: "⚡" },
  { type: "gauge", label: "Gauge", icon: "🎯" },
  { type: "status", label: "Status", icon: "🟢" },
];

const authMethods = [
  { value: "none", label: "None" },
  { value: "api-key", label: "API Key" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
];

const AddWidgetDrawer = ({ projectId, onClose, onWidgetAdded }: AddWidgetDrawerProps) => {
  const [step, setStep] = useState(0);

  // Step 0 — Name & Endpoint
  const [title, setTitle] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [authMethod, setAuthMethod] = useState<Widget["authMethod"]>("none");

  // Step 1 — Data Mapping
  const [primaryValuePath, setPrimaryValuePath] = useState("");
  const [labelPath, setLabelPath] = useState("");
  const [seriesPath, setSeriesPath] = useState("");

  // Step 2 — Visualization
  const [vizType, setVizType] = useState<VisualizationType>("kpi-card");

  // Step 3 — Display Options
  const [unitPrefix, setUnitPrefix] = useState("");
  const [unitSuffix, setUnitSuffix] = useState("");
  const [decimalPlaces, setDecimalPlaces] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // UI state
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTestEndpoint = async () => {
    if (!endpointUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(endpointUrl, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        setTestResult({ ok: true, message: `✓ ${res.status} OK — Response received.` });
      } else {
        setTestResult({ ok: false, message: `✗ Status ${res.status}: ${res.statusText}` });
      }
    } catch {
      setTestResult({ ok: false, message: "✗ Request failed. Check the URL or CORS settings." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await addWidget(projectId, {
        title,
        endpointUrl,
        authMethod,
        authConfig: {},
        dataMapping: {
          primaryValuePath,
          labelPath: labelPath || undefined,
          seriesPath: seriesPath || undefined,
        },
        visualization: vizType,
        displayOptions: {
          unitPrefix,
          unitSuffix,
          decimalPlaces,
          colorPalette: "default",
        },
        refreshInterval,
        lastFetchedAt: null,
      });
      onWidgetAdded();
    } catch (err) {
      console.error("Failed to add widget:", err);
    } finally {
      setSaving(false);
    }
  };

  const canGoNext = () => {
    if (step === 0) return title.trim().length > 0 && endpointUrl.trim().length > 0;
    if (step === 1) return primaryValuePath.trim().length > 0;
    return true;
  };

  const steps = ["Name & Endpoint", "Map Data", "Visualization", "Display Options"];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Widget</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-success" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
        <p className="px-6 pt-2 text-micro">{steps[step]}</p>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="text-micro block mb-2">WIDGET TITLE</label>
                <input
                  placeholder="Monthly Revenue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-micro block mb-2">API ENDPOINT URL</label>
                <input
                  placeholder="https://api.example.com/v1/revenue"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-micro block mb-2">AUTHENTICATION</label>
                <select
                  value={authMethod}
                  onChange={(e) => setAuthMethod(e.target.value as Widget["authMethod"])}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  {authMethods.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleTestEndpoint}
                disabled={!endpointUrl || testing}
                className="w-full py-2.5 border border-border hover:border-primary/50 rounded-lg text-body font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : null}
                {testing ? "Testing..." : "Test Endpoint"}
              </button>
              {testResult && (
                <div className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${testResult.ok ? "bg-success/10 text-success border border-success/30" : "bg-destructive/10 text-destructive border border-destructive/30"
                  }`}>
                  {testResult.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                  {testResult.message}
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="text-micro block mb-2">PRIMARY VALUE PATH</label>
                <input
                  placeholder="data.revenue.total"
                  value={primaryValuePath}
                  onChange={(e) => setPrimaryValuePath(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">Dot‐notation path to the main value in the JSON response.</p>
              </div>
              <div>
                <label className="text-micro block mb-2">LABEL PATH (OPTIONAL)</label>
                <input
                  placeholder="data.label"
                  value={labelPath}
                  onChange={(e) => setLabelPath(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-micro block mb-2">SERIES DATA PATH (OPTIONAL)</label>
                <input
                  placeholder="data.monthly"
                  value={seriesPath}
                  onChange={(e) => setSeriesPath(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">Path to array of objects with "label" and "value" keys (for charts).</p>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="grid grid-cols-3 gap-3">
              {vizTypes.map((v) => (
                <button
                  key={v.type}
                  onClick={() => setVizType(v.type)}
                  className={`p-4 rounded-xl text-center transition-all border ${vizType === v.type
                      ? "bg-primary/10 border-primary ring-1 ring-primary"
                      : "bg-muted/30 border-border hover:border-primary/40"
                    }`}
                >
                  <span className="text-2xl block mb-1">{v.icon}</span>
                  <span className="text-xs">{v.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-micro block mb-2">UNIT PREFIX</label>
                  <input
                    placeholder="$"
                    value={unitPrefix}
                    onChange={(e) => setUnitPrefix(e.target.value)}
                    className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-micro block mb-2">UNIT SUFFIX</label>
                  <input
                    placeholder="%"
                    value={unitSuffix}
                    onChange={(e) => setUnitSuffix(e.target.value)}
                    className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-micro block mb-2">DECIMAL PLACES</label>
                <input
                  type="number"
                  min={0}
                  max={4}
                  value={decimalPlaces}
                  onChange={(e) => setDecimalPlaces(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-micro block mb-2">AUTO REFRESH (SECONDS)</label>
                <select
                  value={refreshInterval ?? ""}
                  onChange={(e) => setRefreshInterval(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  <option value="">Manual only</option>
                  <option value="30">Every 30s</option>
                  <option value="60">Every 60s</option>
                  <option value="300">Every 5 min</option>
                  <option value="900">Every 15 min</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 border border-border rounded-lg text-body hover:bg-muted transition-all flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? "Adding..." : "Add to Dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddWidgetDrawer;

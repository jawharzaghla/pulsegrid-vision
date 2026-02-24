import { useState, useMemo, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Loader2, Check, AlertCircle, Sparkles, Eye } from "lucide-react";
import { addWidget, updateWidget } from "@/services/firestore.service";
import { encrypt, decrypt } from "@/services/crypto.service";
import { useAuth } from "@/contexts/AuthContext";
import { testConnection } from "@/services/api-fetch.service";
import { extractWithAI, AIError } from "@/services/groq.service";
import { UpgradeModal } from "@/components/UpgradeModal";
import { TIER_LIMITS } from "@/types/models";
import type {
  Widget,
  VisualizationType,
  CleanedMetricPayload,
  DrawerErrorCode,
} from "@/types/models";
import { DRAWER_ERROR_MESSAGES, getCompatibleVisualizations } from "@/types/models";

// =====================
// Props & Constants
// =====================

interface AddWidgetDrawerProps {
  projectId: string;
  editingWidget?: Widget | null;
  onClose: () => void;
  onWidgetAdded: () => void;
}

const VIZ_TYPES: { type: VisualizationType; label: string; icon: string }[] = [
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

const AUTH_METHODS = [
  { value: "none", label: "None" },
  { value: "api-key", label: "API Key Header" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
] as const;

const REFRESH_OPTIONS = [
  { value: "", label: "Manual" },
  { value: "30", label: "30s" },
  { value: "60", label: "1 min" },
  { value: "300", label: "5 min" },
  { value: "900", label: "15 min" },
];

const COLOR_SWATCHES = [
  "#7B2FBE", "#00C9A7", "#3498DB", "#F59E0B", "#22C55E", "#EF4444",
];

const INCOMPATIBILITY_REASONS: Partial<Record<VisualizationType, string>> = {
  "line-chart": "Données de série requises pour le Line Chart",
  "bar-chart": "Données de série requises pour le Bar Chart",
  "area-chart": "Données de série requises pour l'Area Chart",
  "donut-chart": "Données de série requises pour le Donut Chart",
  "data-table": "Données de série requises pour le Data Table",
};

const STEPS = ["Endpoint", "Extraction IA", "Visualisation", "Options"];

// =====================
// URL Validation
// =====================

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "javascript:" || parsed.protocol === "data:") return false;
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// =====================
// Component
// =====================

const AddWidgetDrawer = ({ projectId, editingWidget, onClose, onWidgetAdded }: AddWidgetDrawerProps) => {
  const [step, setStep] = useState(0);
  const { cryptoKey, tier } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Step 1 — Endpoint Configuration
  const [title, setTitle] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [authMethod, setAuthMethod] = useState<Widget["authMethod"]>("none");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const [rawJson, setRawJson] = useState<unknown>(null);

  // Step 2 — AI Extraction
  const [userDescription, setUserDescription] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedPayload, setExtractedPayload] = useState<CleanedMetricPayload | null>(null);

  // Step 3 — Visualization
  const [vizType, setVizType] = useState<VisualizationType | null>(null);

  // Step 4 — Display Options
  const [unitPrefix, setUnitPrefix] = useState("");
  const [unitSuffix, setUnitSuffix] = useState("");
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [colorPalette, setColorPalette] = useState(COLOR_SWATCHES[0]);
  const [saving, setSaving] = useState(false);

  // Shared error state
  const [drawerError, setDrawerError] = useState<{ code: DrawerErrorCode; message: string } | null>(null);

  // Pre-fill state when editing
  useEffect(() => {
    if (editingWidget) {
      setTitle(editingWidget.title);
      setEndpointUrl(editingWidget.endpointUrl);
      setAuthMethod(editingWidget.authMethod);

      const config = editingWidget.authConfig;
      if (editingWidget.authMethod === "api-key") {
        setApiKeyHeader(config.headerName || "X-API-Key");
      }

      setUserDescription(editingWidget.dataMapping.aiDescription || "");
      setVizType(editingWidget.visualization);
      setUnitPrefix(editingWidget.displayOptions.unitPrefix || "");
      setUnitSuffix(editingWidget.displayOptions.unitSuffix || "");
      setDecimalPlaces(editingWidget.displayOptions.decimalPlaces ?? 2);
      setRefreshInterval(editingWidget.refreshInterval);
      setColorPalette(editingWidget.displayOptions.colorPalette || COLOR_SWATCHES[0]);

      // Attempt to decrypt credentials if cryptoKey is available
      const decryptCreds = async () => {
        if (!cryptoKey) {
          // If no cryptoKey, maybe they are raw?
          if (editingWidget.authMethod === "api-key" && config.key) setApiKeyValue(config.key);
          if (editingWidget.authMethod === "bearer" && config.token) setBearerToken(config.token);
          if (editingWidget.authMethod === "basic") {
            if (config.username) setBasicUsername(config.username);
            if (config.password) setBasicPassword(config.password);
          }
          return;
        }

        try {
          if (editingWidget.authMethod === "api-key" && config.encryptedKey) {
            setApiKeyValue(await decrypt(config.encryptedKey, cryptoKey));
          } else if (editingWidget.authMethod === "bearer" && config.encryptedToken) {
            setBearerToken(await decrypt(config.encryptedToken, cryptoKey));
          } else if (editingWidget.authMethod === "basic") {
            if (config.encryptedUsername) setBasicUsername(await decrypt(config.encryptedUsername, cryptoKey));
            if (config.encryptedPassword) setBasicPassword(await decrypt(config.encryptedPassword, cryptoKey));
          }
        } catch (err) {
          console.warn("Failed to decrypt credentials for editing:", err);
        }
      };

      decryptCreds();
    }
  }, [editingWidget, cryptoKey]);

  // =====================
  // Derived state
  // =====================

  const compatibleVizTypes = useMemo(() => {
    if (!extractedPayload) return [];
    return getCompatibleVisualizations(extractedPayload);
  }, [extractedPayload]);

  const credentials: Record<string, string> = useMemo(() => {
    switch (authMethod) {
      case "api-key": return { headerName: apiKeyHeader, key: apiKeyValue };
      case "bearer": return { token: bearerToken };
      case "basic": return { username: basicUsername, password: basicPassword };
      default: return {};
    }
  }, [authMethod, apiKeyHeader, apiKeyValue, bearerToken, basicUsername, basicPassword]);

  // =====================
  // Step 1: Test Connection
  // =====================

  const handleTestConnection = async () => {
    setDrawerError(null);

    if (!isValidUrl(endpointUrl)) {
      setDrawerError({ code: "STEP1_URL_INVALID", message: DRAWER_ERROR_MESSAGES.STEP1_URL_INVALID });
      return;
    }

    setTesting(true);
    setTestOk(false);
    setRawJson(null);

    try {
      const result = await testConnection(endpointUrl, authMethod, credentials, cryptoKey);

      if (result.statusText === "TIMEOUT") {
        setDrawerError({ code: "STEP1_TIMEOUT", message: DRAWER_ERROR_MESSAGES.STEP1_TIMEOUT });
        return;
      }

      if (result.statusText === "NOT_JSON") {
        setDrawerError({ code: "STEP1_NOT_JSON", message: DRAWER_ERROR_MESSAGES.STEP1_NOT_JSON });
        return;
      }

      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          setDrawerError({ code: "STEP1_AUTH_FAILED", message: DRAWER_ERROR_MESSAGES.STEP1_AUTH_FAILED });
        } else {
          setDrawerError({
            code: "STEP1_AUTH_FAILED",
            message: `Erreur ${result.status}: ${result.errorSnippet || result.statusText}`,
          });
        }
        return;
      }

      setTestOk(true);
      setRawJson(result.rawJson);
    } catch {
      setDrawerError({ code: "STEP1_TIMEOUT", message: "Erreur réseau inattendue." });
    } finally {
      setTesting(false);
    }
  };

  // =====================
  // Step 2: AI Extraction
  // =====================

  const handleExtract = async () => {
    if (!rawJson || !userDescription.trim()) return;
    setDrawerError(null);
    setExtracting(true);
    setExtractedPayload(null);

    try {
      const payload = await extractWithAI(rawJson, userDescription.trim());
      setExtractedPayload(payload);
      // Auto-set viz type if not set
      const compatible = getCompatibleVisualizations(payload);
      if (compatible.length > 0 && !vizType) {
        setVizType(compatible[0]);
      }
    } catch (err) {
      if (err instanceof AIError) {
        switch (err.code) {
          case "METRIC_NOT_FOUND":
            setDrawerError({ code: "STEP2_METRIC_NOT_FOUND", message: DRAWER_ERROR_MESSAGES.STEP2_METRIC_NOT_FOUND });
            break;
          case "RATE_LIMITED":
            setDrawerError({ code: "STEP2_RATE_LIMITED", message: DRAWER_ERROR_MESSAGES.STEP2_RATE_LIMITED });
            break;
          default:
            setDrawerError({ code: "STEP2_EXTRACTION_FAILED", message: DRAWER_ERROR_MESSAGES.STEP2_EXTRACTION_FAILED });
        }
      } else {
        setDrawerError({ code: "STEP2_EXTRACTION_FAILED", message: DRAWER_ERROR_MESSAGES.STEP2_EXTRACTION_FAILED });
      }
    } finally {
      setExtracting(false);
    }
  };

  // =====================
  // Step 4: Save Widget
  // =====================

  const handleSave = async () => {
    if (!vizType || !extractedPayload) return;
    setSaving(true);
    setDrawerError(null);

    try {
      const authConfig: Record<string, string> = {};

      console.log('[handleSave] Saving with state:', {
        authMethod,
        apiKeyValue: apiKeyValue ? '***' : 'EMPTY',
        bearerToken: bearerToken ? '***' : 'EMPTY',
        hasCryptoKey: !!cryptoKey
      });

      // Validation: Ensure we actually have credentials if needed
      if (authMethod === 'api-key' && !apiKeyValue) {
        setDrawerError({ code: "STEP1_AUTH_FAILED", message: "Clé API manquante" });
        return;
      }
      if (authMethod === 'bearer' && !bearerToken) {
        setDrawerError({ code: "STEP1_AUTH_FAILED", message: "Token manquant" });
        return;
      }

      if (authMethod !== "none") {
        if (cryptoKey) {
          // Encrypted path
          if (authMethod === "api-key") {
            authConfig.headerName = apiKeyHeader || "X-API-Key";
            authConfig.encryptedKey = await encrypt(apiKeyValue, cryptoKey);
          } else if (authMethod === "bearer") {
            authConfig.encryptedToken = await encrypt(bearerToken, cryptoKey);
          } else if (authMethod === "basic") {
            authConfig.encryptedUsername = await encrypt(basicUsername, cryptoKey);
            authConfig.encryptedPassword = await encrypt(basicPassword, cryptoKey);
          }
        } else {
          // Raw path fallback (Google login)
          if (authMethod === "api-key") {
            authConfig.headerName = apiKeyHeader || "X-API-Key";
            authConfig.key = apiKeyValue;
          } else if (authMethod === "bearer") {
            authConfig.token = bearerToken;
          } else if (authMethod === "basic") {
            authConfig.username = basicUsername;
            authConfig.password = basicPassword;
          }
        }
      }

      console.log('[handleSave] Final authConfig payload:', Object.keys(authConfig));

      if (editingWidget) {
        await updateWidget(projectId, editingWidget.id, {
          title,
          endpointUrl,
          authMethod,
          authConfig,
          dataMapping: {
            primaryValuePath: "__ai_extracted__",
            aiDescription: userDescription.trim(),
          },
          visualization: vizType,
          displayOptions: {
            unitPrefix,
            unitSuffix,
            decimalPlaces,
            colorPalette,
          },
          refreshInterval,
        });
      } else {
        await addWidget(projectId, {
          title,
          endpointUrl,
          authMethod,
          authConfig,
          dataMapping: {
            primaryValuePath: "__ai_extracted__",
            aiDescription: userDescription.trim(),
          },
          visualization: vizType,
          displayOptions: {
            unitPrefix,
            unitSuffix,
            decimalPlaces,
            colorPalette,
          },
          refreshInterval,
          lastFetchedAt: null,
        });
      }

      onWidgetAdded();
    } catch {
      setDrawerError({ code: "STEP4_SAVE_FAILED", message: DRAWER_ERROR_MESSAGES.STEP4_SAVE_FAILED });
    } finally {
      setSaving(false);
    }
  };

  // =====================
  // Navigation guards
  // =====================

  const canGoNext = (): boolean => {
    switch (step) {
      case 0: return testOk && title.trim().length > 0;
      case 1: return extractedPayload !== null;
      case 2: return vizType !== null;
      default: return true;
    }
  };

  // =====================
  // Format helpers
  // =====================

  const formatValue = (val: number | string): string => {
    if (typeof val === "number") {
      return `${unitPrefix}${val.toFixed(decimalPlaces)}${unitSuffix}`;
    }
    return `${unitPrefix}${val}${unitSuffix}`;
  };

  // =====================
  // Render
  // =====================

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Widget</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step
                  ? "bg-success text-success-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < step ? "bg-success" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        <p className="px-6 pt-2 text-micro font-medium">{STEPS[step]}</p>

        {/* Error banner (inside step panel) */}
        {drawerError && (
          <div className="mx-6 mt-3 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{drawerError.message}</span>
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ====== STEP 1: ENDPOINT CONFIG ====== */}
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
                  placeholder="https://api.example.com/v1/data"
                  value={endpointUrl}
                  onChange={(e) => {
                    setEndpointUrl(e.target.value);
                    setTestOk(false);
                    setRawJson(null);
                    setDrawerError(null);
                  }}
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
                  {AUTH_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Auth-specific fields */}
              {authMethod === "api-key" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-micro block mb-2">HEADER NAME</label>
                    <input
                      placeholder="X-API-Key"
                      value={apiKeyHeader}
                      onChange={(e) => setApiKeyHeader(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-micro block mb-2">API KEY</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
              )}

              {authMethod === "bearer" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-micro block mb-2">BEARER TOKEN</label>
                  <input
                    type="password"
                    placeholder="eyJh..."
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              )}

              {authMethod === "basic" && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-micro block mb-2">USERNAME</label>
                    <input
                      placeholder="admin"
                      value={basicUsername}
                      onChange={(e) => setBasicUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-micro block mb-2">PASSWORD</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={basicPassword}
                      onChange={(e) => setBasicPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
              )}

              {!cryptoKey && authMethod !== "none" && (
                <div className="px-4 py-3 bg-warning/10 border border-warning/30 rounded-lg text-xs text-warning flex items-center gap-2">
                  <AlertCircle size={14} />
                  Encryption key not available. Please re-login to enable secure API storage.
                </div>
              )}

              {/* Test Connection button */}
              <button
                onClick={handleTestConnection}
                disabled={!endpointUrl.trim() || testing}
                className="w-full py-2.5 border border-border hover:border-primary/50 rounded-lg text-body font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : null}
                {testing ? "Testing..." : "Test Connection"}
              </button>

              {/* Test result */}
              {testOk && (
                <div className="px-4 py-3 rounded-lg text-sm flex items-center gap-2 bg-success/10 text-success border border-success/30">
                  <Check size={14} />
                  200 OK — API response received
                </div>
              )}

              {/* Raw JSON viewer */}
              {rawJson && (
                <div>
                  <label className="text-micro block mb-2">RAW RESPONSE</label>
                  <pre className="p-4 bg-muted/30 border border-border rounded-lg text-xs text-foreground/80 overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                    {JSON.stringify(rawJson, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}

          {/* ====== STEP 2: AI DATA EXTRACTION ====== */}
          {step === 1 && (
            <>
              {/* Read-only raw JSON */}
              <div>
                <label className="text-micro block mb-2">API RESPONSE (READ-ONLY)</label>
                <pre className="p-4 bg-muted/30 border border-border rounded-lg text-xs text-foreground/80 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                  {JSON.stringify(rawJson, null, 2)}
                </pre>
              </div>

              {/* Natural language description */}
              <div>
                <label className="text-micro block mb-2">WHAT METRIC DO YOU WANT TO TRACK?</label>
                <input
                  placeholder="ex: le revenu mensuel total, le nombre d'utilisateurs actifs, le taux de conversion"
                  value={userDescription}
                  onChange={(e) => {
                    setUserDescription(e.target.value);
                    setDrawerError(null);
                  }}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {/* Extract button */}
              <button
                onClick={handleExtract}
                disabled={!userDescription.trim() || extracting}
                className="w-full py-3 bg-accent/20 border border-accent/40 hover:bg-accent/30 text-accent rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {extracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {extracting ? "Extraction en cours..." : "Extract with AI"}
              </button>

              {/* Extracted payload preview card */}
              {extractedPayload && (
                <div className="p-5 bg-muted/30 border border-accent/30 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-accent text-xs font-semibold">
                    <Check size={14} />
                    EXTRACTION SUCCESSFUL
                  </div>

                  <div className="text-3xl font-bold text-foreground">
                    {extractedPayload.unit && <span className="text-muted-foreground text-xl">{extractedPayload.unit}</span>}
                    {typeof extractedPayload.primaryValue === "number"
                      ? extractedPayload.primaryValue.toLocaleString()
                      : extractedPayload.primaryValue}
                  </div>

                  {extractedPayload.widgetTitle && (
                    <p className="text-sm text-muted-foreground">{extractedPayload.widgetTitle}</p>
                  )}

                  {extractedPayload.trend !== undefined && (
                    <span className={`text-sm font-medium ${extractedPayload.trend >= 0 ? "text-success" : "text-destructive"}`}>
                      {extractedPayload.trend >= 0 ? "+" : ""}{extractedPayload.trend}%
                    </span>
                  )}

                  {extractedPayload.series && extractedPayload.series.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-micro mb-2">SERIES DATA ({extractedPayload.series.length} points)</p>
                      <div className="flex gap-2 flex-wrap">
                        {extractedPayload.series.slice(0, 5).map((s, i) => (
                          <span key={i} className="px-2 py-1 bg-muted/50 rounded text-xs">
                            {s.label}: {s.value}
                          </span>
                        ))}
                        {extractedPayload.series.length > 5 && (
                          <span className="px-2 py-1 text-xs text-muted-foreground">
                            +{extractedPayload.series.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ====== STEP 3: VISUALIZATION ====== */}
          {step === 2 && (
            <div className="grid grid-cols-3 gap-3">
              {VIZ_TYPES.map((v) => {
                const isCompatible = compatibleVizTypes.includes(v.type);
                const reason = !isCompatible ? (INCOMPATIBILITY_REASONS[v.type] || "Non compatible") : "";

                return (
                  <div key={v.type} className="relative group">
                    <button
                      onClick={() => isCompatible && setVizType(v.type)}
                      disabled={!isCompatible}
                      className={`w-full p-4 rounded-xl text-center transition-all border ${!isCompatible
                        ? "opacity-40 cursor-not-allowed bg-muted/10 border-border"
                        : vizType === v.type
                          ? "bg-primary/10 border-primary ring-1 ring-primary"
                          : "bg-muted/30 border-border hover:border-primary/40"
                        }`}
                    >
                      <span className="text-2xl block mb-1">{v.icon}</span>
                      <span className="text-xs">{v.label}</span>
                    </button>

                    {/* Tooltip for incompatible types */}
                    {!isCompatible && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ====== STEP 4: DISPLAY OPTIONS ====== */}
          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-micro block mb-2">UNIT PREFIX</label>
                  <input
                    placeholder="$, €"
                    value={unitPrefix}
                    onChange={(e) => setUnitPrefix(e.target.value)}
                    className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-micro block mb-2">UNIT SUFFIX</label>
                  <input
                    placeholder="%, k"
                    value={unitSuffix}
                    onChange={(e) => setUnitSuffix(e.target.value)}
                    className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-micro block mb-2">DECIMAL PLACES</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDecimalPlaces(Math.max(0, decimalPlaces - 1))}
                    className="w-10 h-10 bg-muted/50 border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-all"
                  >
                    −
                  </button>
                  <span className="text-lg font-bold w-8 text-center">{decimalPlaces}</span>
                  <button
                    onClick={() => setDecimalPlaces(Math.min(4, decimalPlaces + 1))}
                    className="w-10 h-10 bg-muted/50 border border-border rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-micro block mb-2">REFRESH INTERVAL</label>
                <select
                  value={refreshInterval ?? ""}
                  onChange={(e) => setRefreshInterval(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  {REFRESH_OPTIONS.map((o) => {
                    const minInt = TIER_LIMITS[tier || 'free'].minRefreshInterval;
                    const isDisabled = o.value !== "" && (minInt === null || Number(o.value) < minInt);
                    return (
                      <option key={o.value} value={o.value} disabled={isDisabled}>
                        {o.label} {isDisabled ? "(Pro only)" : ""}
                      </option>
                    );
                  })}
                </select>
                {(tier === 'free' || !tier) && (
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-[10px] text-pg-primary mt-1 hover:underline"
                  >
                    Débloquer le rafraîchissement automatique →
                  </button>
                )}
              </div>

              <div>
                <label className="text-micro block mb-2">COLOR PALETTE</label>
                <div className="flex gap-2">
                  {COLOR_SWATCHES.map((color) => (
                    <button
                      key={color}
                      onClick={() => setColorPalette(color)}
                      className={`w-9 h-9 rounded-full transition-all hover:scale-110 ${colorPalette === color ? "ring-2 ring-foreground/50 scale-110" : ""
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Live preview */}
              {extractedPayload && vizType && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={14} className="text-muted-foreground" />
                    <label className="text-micro">LIVE PREVIEW</label>
                  </div>
                  <div className="p-5 bg-muted/20 border border-border rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">{title || "Widget"}</p>
                    <p className="text-3xl font-bold" style={{ color: colorPalette }}>
                      {formatValue(extractedPayload.primaryValue)}
                    </p>
                    {extractedPayload.trend !== undefined && (
                      <span className={`text-sm font-medium ${extractedPayload.trend >= 0 ? "text-success" : "text-destructive"}`}>
                        {extractedPayload.trend >= 0 ? "↑" : "↓"} {Math.abs(extractedPayload.trend)}%
                      </span>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 bg-muted/50 rounded-full">{VIZ_TYPES.find(v => v.type === vizType)?.label}</span>
                      {refreshInterval && <span>⟳ {REFRESH_OPTIONS.find(o => o.value === String(refreshInterval))?.label}</span>}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer navigation */}
        <div className="p-6 border-t border-border flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => { setStep(step - 1); setDrawerError(null); }}
              className="px-4 py-2.5 border border-border rounded-lg text-body hover:bg-muted transition-all flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={() => { setStep(step + 1); setDrawerError(null); }}
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

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Rafraîchissement Automatique"
        description="Le rafraîchissement automatique est une fonctionnalité Premium. Passez à Pro pour des mises à jour toutes les 30 secondes."
      />
    </div>
  );
};

export default AddWidgetDrawer;

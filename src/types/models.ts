// ============================================
// PulseGrid — Core TypeScript Models
// Source of truth: INSTRUCTIONS.md Section 6
// ============================================

// --- User ---
export interface PulseGridUser {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'business';
  createdAt: string;
  photoURL?: string;
  encryptionSalt?: string; // Base64 encoded salt for PBKDF2
}

// --- Project ---
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  emoji: string;
  accentColor: string;
  theme: ProjectTheme;
  widgets: Widget[];
  layout: LayoutItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTheme {
  mode: 'dark' | 'light' | 'system';
  chartPalette: string;
  fontSize: 'compact' | 'comfortable' | 'spacious';
  widgetBorder: 'none' | 'subtle' | 'card' | 'elevated';
}

// --- Widget ---
export interface Widget {
  id: string;
  projectId: string;
  title: string;
  endpointUrl: string;
  authMethod: 'none' | 'api-key' | 'bearer' | 'basic';
  authConfig: Record<string, string>; // encrypted at rest
  dataMapping: DataMapping;
  visualization: VisualizationType;
  displayOptions: DisplayOptions;
  refreshInterval: number | null; // seconds, null = manual only
  lastFetchedAt: string | null;
}

export interface DataMapping {
  primaryValuePath: string;   // e.g. "data.revenue.total" or "__ai_extracted__"
  labelPath?: string;
  secondaryValuePath?: string;
  seriesPath?: string;
  aiDescription?: string;     // stored for AI re-extraction on refresh
}

export type VisualizationType =
  | 'kpi-card'
  | 'line-chart'
  | 'bar-chart'
  | 'donut-chart'
  | 'area-chart'
  | 'gauge'
  | 'data-table'
  | 'sparkline'
  | 'status';

export interface DisplayOptions {
  unitPrefix?: string;
  unitSuffix?: string;
  decimalPlaces: number;
  colorPalette: string;
}

export interface LayoutItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// --- AI Analysis ---
export type AnalysisMode = 'project-brief' | 'widget' | 'ask' | 'daily-brief';

export interface AnalysisRequest {
  projectId: string;
  mode: AnalysisMode;
  widgetData: CleanedMetricPayload[];
  question?: string; // for 'ask' mode only
}

export interface CleanedMetricPayload {
  widgetTitle: string;
  primaryValue: number | string;
  unit?: string;
  trend?: number;
  series?: Array<{ label: string; value: number }>;
}

// --- Tier Limits ---
export const TIER_LIMITS = {
  free: { projects: 2, widgetsPerProject: 5, aiAnalysesPerDay: 5, minRefreshInterval: null, teamMembers: 1 },
  pro: { projects: 10, widgetsPerProject: 25, aiAnalysesPerDay: 100, minRefreshInterval: 30, teamMembers: 3 },
  business: { projects: Infinity, widgetsPerProject: Infinity, aiAnalysesPerDay: Infinity, minRefreshInterval: 1, teamMembers: 15 },
} as const;

// --- Error Types ---
export type WidgetErrorCode =
  | 'FETCH_TIMEOUT'
  | 'FETCH_AUTH_FAILED'
  | 'FETCH_PARSE_ERROR'
  | 'FETCH_NETWORK_ERROR'
  | 'AI_RATE_LIMITED'
  | 'AI_UNAVAILABLE';

export interface WidgetError {
  code: WidgetErrorCode;
  message: string;
  widgetId: string;
}

// --- Drawer Error Types ---
export type DrawerErrorCode =
  | 'STEP1_URL_INVALID'
  | 'STEP1_TIMEOUT'
  | 'STEP1_AUTH_FAILED'
  | 'STEP1_NOT_JSON'
  | 'STEP2_METRIC_NOT_FOUND'
  | 'STEP2_EXTRACTION_FAILED'
  | 'STEP2_RATE_LIMITED'
  | 'STEP4_SAVE_FAILED';

export const DRAWER_ERROR_MESSAGES: Record<DrawerErrorCode, string> = {
  STEP1_URL_INVALID: "URL invalide. Doit commencer par https://",
  STEP1_TIMEOUT: "L'endpoint n'a pas répondu en 10 secondes.",
  STEP1_AUTH_FAILED: "Accès refusé (401/403). Vérifiez vos credentials.",
  STEP1_NOT_JSON: "La réponse n'est pas du JSON valide. PulseGrid ne supporte que les API JSON.",
  STEP2_METRIC_NOT_FOUND: "L'IA n'a pas trouvé cette métrique. Reformulez votre description.",
  STEP2_EXTRACTION_FAILED: "Erreur d'extraction IA. Réessayez ou vérifiez la réponse de votre API.",
  STEP2_RATE_LIMITED: "Quota IA journalier atteint. Passez à Pro pour plus d'analyses.",
  STEP4_SAVE_FAILED: "Impossible de sauvegarder le widget. Vérifiez l'espace disponible.",
};

// --- Visualization Compatibility ---
export function getCompatibleVisualizations(payload: CleanedMetricPayload): VisualizationType[] {
  const hasSeries = payload.series && payload.series.length > 0;
  const hasPrimary = payload.primaryValue !== undefined && payload.primaryValue !== null;

  const always: VisualizationType[] = hasPrimary
    ? ['kpi-card', 'gauge', 'sparkline', 'status']
    : [];

  const seriesOnly: VisualizationType[] = hasSeries
    ? ['line-chart', 'bar-chart', 'donut-chart', 'area-chart', 'data-table']
    : [];

  return [...always, ...seriesOnly];
}

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
  primaryValuePath: string;   // e.g. "data.revenue.total"
  labelPath?: string;
  secondaryValuePath?: string;
  seriesPath?: string;
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

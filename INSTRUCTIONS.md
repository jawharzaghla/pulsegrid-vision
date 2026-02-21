# PULSEGRID — Agent Instructions & Architecture Reference

> **Read this entire file before writing a single line of code.**
> This is the source of truth for the project. Every decision — architectural, stylistic, and functional — is defined here. Do not deviate without explicit instruction.

---

## 1. What Is PulseGrid?

PulseGrid is a **SaaS Business Intelligence platform** for multi-business operators. It lets users connect any REST API, configure a widget, and get a live, AI-enriched dashboard in one unified workspace.

**The core problem it solves:** operators managing multiple businesses waste 60+ minutes daily hopping between fragmented dashboards with inconsistent layouts, separate logins, and no cross-business visibility.

**The core value proposition:** one authenticated workspace, any REST API, AI-powered analysis via Groq, zero backend data infrastructure.

**Tagline:** *"Unified Intelligence. Zero Overhead."*

---

## 2. Tech Stack — Non-Negotiable

| Layer | Technology |
|---|---|
| Frontend Framework | Angular (latest stable) |
| Styling | Tailwind CSS — utility-first, no custom CSS files |
| Charting | ApexCharts |
| AI Engine | Groq API — model: `llama-3.3-70b-versatile` |
| Data Fetching | REST (browser-to-API direct, no backend proxy for data) |
| Credential Storage | Web Crypto API — AES-GCM 256-bit encrypted localStorage |
| Auth | JWT with refresh token rotation |
| Auth Backend | Thin Node/Express service or Supabase (user accounts + Groq key proxy only) |
| Markup | HTML5 semantic elements |
| State Management | Angular Signals (preferred) or NgRx for complex global state |

**Do not introduce any additional libraries, frameworks, or dependencies without explicit approval.** If you feel a library is needed, state it clearly and wait for confirmation.

---

## 3. Project Structure

Follow Angular best practices with feature-based folder structure. This is the canonical layout:

```
src/
├── app/
│   ├── core/                          # Singleton services, guards, interceptors
│   │   ├── services/
│   │   │   ├── auth.service.ts        # JWT login, signup, token refresh
│   │   │   ├── crypto.service.ts      # Web Crypto AES-GCM encrypt/decrypt
│   │   │   ├── storage.service.ts     # Encrypted localStorage read/write
│   │   │   ├── api-fetch.service.ts   # REST widget data fetching
│   │   │   └── groq.service.ts        # Groq AI analysis proxy calls
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts    # Attaches JWT to outgoing requests
│   │   └── models/
│   │       ├── user.model.ts
│   │       ├── project.model.ts
│   │       ├── widget.model.ts
│   │       └── analysis.model.ts
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── projects/
│   │   │   ├── project-list/
│   │   │   └── project-settings/
│   │   ├── dashboard/
│   │   │   ├── dashboard-canvas/
│   │   │   ├── widget-shell/
│   │   │   └── widget-drawer/
│   │   └── ai-panel/
│   │       └── ai-analysis-panel/
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── kpi-card/
│   │   │   ├── chart-wrapper/
│   │   │   ├── data-table/
│   │   │   ├── gauge/
│   │   │   ├── status-indicator/
│   │   │   ├── toast/
│   │   │   └── skeleton-loader/
│   │   ├── directives/
│   │   └── pipes/
│   │
│   └── app.routes.ts
```

**Rules:**
- Each feature module is lazy-loaded via Angular route-level lazy loading
- Core services are provided in `root` (singleton pattern)
- Shared components are dumb/presentational — they receive data via `@Input()` and emit events via `@Output()`
- Feature components hold business logic and call services

---

## 4. Architecture Principles

### 4.1 Clean Code Rules

- **Single Responsibility:** every class, service, and component does exactly one thing
- **No logic in templates:** computed values belong in the component class or a pipe, never inline in HTML
- **No `any`:** TypeScript strict mode is on. Every variable, parameter, and return value must be typed. Use `unknown` before `any`
- **Immutability:** never mutate state directly. Use spread operators and return new objects
- **Observable hygiene:** always unsubscribe from observables. Use `takeUntilDestroyed()` in Angular 17+ or `AsyncPipe` in templates
- **No `console.log` in production code:** use a `LoggerService` that wraps console and can be silenced in prod
- **One component per file:** no inline component declarations

### 4.2 Service Boundaries

```
Component → calls → Service → calls → External API
                ↓
           (never the reverse)
```

Components never call `fetch()` or `HttpClient` directly. All external calls go through services. This is mandatory.

### 4.3 Data Flow

```
REST API → api-fetch.service → widget.component (display only)
                            ↓
                     groq.service (receives cleaned JSON only)
                            ↓
                     ai-panel.component
```

---

## 5. Security Architecture — Critical, Read Carefully

### 5.1 API Key Storage

All user API keys (Stripe, Shopify, custom REST endpoints, etc.) are **encrypted client-side before persistence**. This is handled entirely by `crypto.service.ts`.

**Encryption scheme:**
1. On signup, a salt is generated using `crypto.getRandomValues()`
2. The user's password is passed through PBKDF2 (100,000 iterations, SHA-256) to derive an AES-GCM encryption key
3. The derived key encrypts all API keys with AES-GCM-256 before writing to localStorage
4. The master password is **never stored** — only the salt is persisted
5. On login, the password re-derives the key, decrypting credentials into session memory only
6. On logout or tab close, all decrypted keys are zeroed out from memory

**The `crypto.service.ts` must expose:**
```typescript
deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>
encrypt(data: string, key: CryptoKey): Promise<string>  // returns base64 ciphertext
decrypt(ciphertext: string, key: CryptoKey): Promise<string>
generateSalt(): Uint8Array
```

**Never:**
- Store the master password in any form
- Store decrypted API keys in localStorage
- Log decrypted keys anywhere

### 5.2 Groq API Key

The Groq API key is a **platform-level secret**. It lives in the auth backend's environment variables only. It is never sent to the client. All AI analysis requests are proxied:

```
POST /api/ai/analyze
Authorization: Bearer <user JWT>
Body: { widgetData: CleanedMetricPayload[], mode: AnalysisMode }
```

The backend validates the JWT, enforces rate limits by tier, then calls Groq. The user never sees the Groq key.

### 5.3 XSS Protection

- Angular's template engine escapes all interpolated values by default — do not bypass this
- Never use `[innerHTML]` without explicit sanitization via Angular's `DomSanitizer`
- Never use `bypassSecurityTrustHtml()` unless absolutely necessary and reviewed

### 5.4 JWT Handling

- Access tokens: short-lived (15 minutes)
- Refresh tokens: 7-day rolling window
- Tokens stored in `httpOnly` cookies — not localStorage — to prevent XSS access
- `auth.interceptor.ts` automatically attaches the access token to all authenticated requests
- On 401, the interceptor attempts a silent refresh before propagating the error

---

## 6. Core Models

These are the canonical TypeScript interfaces. Do not change field names without updating all consumers.

```typescript
// user.model.ts
export interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'business';
  createdAt: string;
}

// project.model.ts
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

// widget.model.ts
export interface Widget {
  id: string;
  projectId: string;
  title: string;
  endpointUrl: string;
  authMethod: 'none' | 'api-key' | 'bearer' | 'basic';
  authConfig: Record<string, string>;  // encrypted at rest
  dataMapping: DataMapping;
  visualization: VisualizationType;
  displayOptions: DisplayOptions;
  refreshInterval: number | null;  // seconds, null = manual only
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

// analysis.model.ts
export type AnalysisMode = 'project-brief' | 'widget' | 'ask' | 'daily-brief';

export interface AnalysisRequest {
  projectId: string;
  mode: AnalysisMode;
  widgetData: CleanedMetricPayload[];
  question?: string;  // for 'ask' mode only
}

export interface CleanedMetricPayload {
  widgetTitle: string;
  primaryValue: number | string;
  unit?: string;
  trend?: number;
  series?: Array<{ label: string; value: number }>;
}
```

---

## 7. Services — Implementation Guide

### 7.1 `api-fetch.service.ts`

Responsibilities:
- Accept a `Widget` object
- Decrypt auth credentials using `crypto.service`
- Build the HTTP request with correct auth headers
- Execute the fetch
- Apply `DataMapping` to extract values from the raw response
- Return a normalized `CleanedMetricPayload`
- Handle errors gracefully (timeout, 401, 403, malformed JSON)

Key method signature:
```typescript
fetchWidgetData(widget: Widget, decryptionKey: CryptoKey): Observable<CleanedMetricPayload>
```

Widget data is fetched in parallel on dashboard load using `forkJoin`. One failure must not block the others.

### 7.2 `groq.service.ts`

Responsibilities:
- Accept an `AnalysisRequest`
- POST it to the PulseGrid backend proxy endpoint
- Stream the response if Groq streaming is enabled (SSE)
- Return the analysis as a markdown string
- Handle 429 rate limit errors gracefully with a user-facing upgrade prompt

Never call the Groq API directly from the browser.

### 7.3 `storage.service.ts`

Responsibilities:
- Provide typed read/write methods for all localStorage keys
- All sensitive data reads/writes go through `crypto.service`
- Maintain a registry of all localStorage keys — no magic strings anywhere else

```typescript
export const STORAGE_KEYS = {
  PROJECTS: 'pg_projects',
  WIDGET_LAYOUTS: 'pg_layouts',
  ENCRYPTED_CREDENTIALS: 'pg_creds',
  ENCRYPTION_SALT: 'pg_salt',
  THEME_PREFERENCE: 'pg_theme',
} as const;
```

---

## 8. Widget Data Flow — Step by Step

This is the exact sequence on dashboard load:

1. `dashboard-canvas.component` receives the active `Project` from the route resolver
2. Component calls `api-fetch.service.fetchAllWidgets(project.widgets, decryptionKey)`
3. Service uses `forkJoin` to fire all widget fetches in parallel
4. Each fetch: decrypt credentials → build HTTP request → call endpoint → extract values via data mapping → return `CleanedMetricPayload`
5. Each payload is passed to the corresponding `widget-shell.component` via `@Input()`
6. `widget-shell` selects and renders the correct visualization component based on `widget.visualization`
7. If a refresh interval is set, a timer (`interval()`) re-triggers the fetch cycle for that widget only

---

## 9. AI Analysis Flow

1. User clicks "AI Brief" on the dashboard
2. `ai-analysis-panel.component` collects all `CleanedMetricPayload` objects currently loaded in memory
3. Raw API response data is never included — only the mapped, normalized metric values
4. `groq.service.analyze(request)` POSTs to `/api/ai/analyze` with the user's JWT
5. Backend validates JWT, checks rate limit, calls Groq with the system prompt + data
6. Response streams back and renders as markdown in the panel

**System prompt (backend-defined) includes:** widget titles, metric names, units, time context, instruction to return structured markdown with Summary, Insights, and Anomalies sections.

**Rate limits enforced server-side:**
- Free: 5 analyses/day
- Pro: 100/day
- Business: unlimited

---

## 10. Routing Structure

```typescript
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/landing/landing.component') },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component') },
  { path: 'signup', loadComponent: () => import('./features/auth/signup/signup.component') },
  {
    path: 'app',
    canActivate: [authGuard],
    loadChildren: () => import('./features/app-shell/app-shell.routes'),
    children: [
      { path: 'projects', loadComponent: () => import('./features/projects/project-list/project-list.component') },
      { path: 'projects/:id', loadComponent: () => import('./features/dashboard/dashboard-canvas/dashboard-canvas.component') },
      { path: 'projects/:id/settings', loadComponent: () => import('./features/projects/project-settings/project-settings.component') },
      { path: 'settings', loadComponent: () => import('./features/account/account-settings.component') },
    ]
  },
  { path: '**', redirectTo: '' }
];
```

All `/app/*` routes are protected by `authGuard`. The guard checks for a valid access token and attempts silent refresh if expired before redirecting to `/login`.

---

## 11. SaaS Tier Enforcement

Tier limits are enforced **server-side** in all cases. The frontend reflects limits for UX only — never trust frontend-only enforcement.

| Limit | Free | Pro | Business |
|---|---|---|---|
| Projects | 2 | 10 | Unlimited |
| Widgets per project | 5 | 25 | Unlimited |
| AI analyses/day | 5 | 100 | Unlimited |
| Refresh interval | Manual | 30s minimum | Real-time |
| Team members | 1 | 3 | 15 |

When a user hits a limit, show a non-blocking upgrade prompt (banner or modal). Never a hard crash or error toast.

---

## 12. Design System Reference

The UI was built in Lovable. Match these tokens exactly when wiring components:

```
Primary:      #7B2FBE  (purple)
Accent:       #00C9A7  (teal)
Background:   #0F0F1A  (dark)
Surface:      #1A1A2E  (card)
Border:       #2A2A45
Muted text:   #6B7280
White:        #FFFFFF

Border radius: 12px cards, 8px inputs/buttons, 999px badges
Shadows: 0 4px 24px rgba(0,0,0,0.4)
Font: Inter
Transitions: 200ms ease on all interactive elements
```

Extend Tailwind config with custom tokens:

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      pg: {
        primary: '#7B2FBE',
        accent:  '#00C9A7',
        bg:      '#0F0F1A',
        surface: '#1A1A2E',
        border:  '#2A2A45',
        muted:   '#6B7280',
      }
    }
  }
}
```

---

## 13. Component Rules

### Shared Components Must:
- Accept all data via typed `@Input()` — never inject services directly
- Emit all user actions via typed `@Output()` EventEmitters
- Have zero side effects
- Be documented with JSDoc on all public inputs/outputs

### Feature Components Must:
- Inject services for data
- Use `AsyncPipe` in templates (avoids manual subscription management)
- Implement loading, error, and empty states for every async operation
- Never contain inline styles — Tailwind classes only

### Widget Shell Pattern:
```typescript
@Component({
  selector: 'pg-widget-shell',
  template: `
    @switch (widget.visualization) {
      @case ('kpi-card') {
        <pg-kpi-card [data]="data" [options]="widget.displayOptions" />
      }
      @case ('line-chart') {
        <pg-chart-wrapper type="line" [data]="data" [options]="widget.displayOptions" />
      }
      @default {
        <pg-skeleton-loader />
      }
    }
  `
})
```

---

## 14. Error Handling

All errors are handled at the service level before reaching the component. Components receive either data or a typed error state — never raw exceptions.

| Error Code | Cause | UI Behavior |
|---|---|---|
| `FETCH_TIMEOUT` | Endpoint too slow | Error state inside widget card |
| `FETCH_AUTH_FAILED` | 401/403 from third-party API | Error state + re-configure prompt |
| `FETCH_PARSE_ERROR` | Response is not valid JSON | Error state inside widget card |
| `FETCH_NETWORK_ERROR` | No connection | Error state inside widget card |
| `AI_RATE_LIMITED` | User hit daily AI limit | Upgrade prompt modal |
| `AI_UNAVAILABLE` | Groq service down | Toast notification |

Each widget keeps its last successfully fetched data visible while showing an error indicator. Errors in one widget never affect others.

---

## 15. What the Lovable Frontend Already Has

The UI shell was generated in Lovable with Angular + Tailwind. It includes:
- All page layouts and component visual structure
- Hardcoded mock data throughout
- ApexCharts instances with static datasets
- No services, no HTTP calls, no auth logic, no real state

**Your job is to wire it up:**
- Replace all hardcoded mock data with service calls
- Implement all services defined in Section 7
- Implement the Web Crypto encryption layer (Section 5)
- Implement JWT auth with interceptor and guard
- Connect the Groq AI panel to real data
- Add drag-and-drop layout persistence
- Enforce tier limits in the UI (Section 11)
- Add all error and loading states (Section 14)

Do not redesign or restructure the existing UI. Match the Lovable output exactly.

---

## 16. Development Phase Order

Work in this exact sequence. Do not jump phases.

**Phase 1 — Auth & Crypto Foundation**
- `crypto.service.ts` with full Web Crypto implementation and unit tests
- `auth.service.ts` — login, signup, token refresh
- `auth.interceptor.ts` — JWT attachment and 401 retry
- `auth.guard.ts` — route protection
- `storage.service.ts` — typed encrypted localStorage layer

**Phase 2 — Widget Engine**
- `api-fetch.service.ts` — REST fetch with credential decryption and data mapping
- `widget-shell.component` wired to live data
- All chart types connected to real `CleanedMetricPayload` structure
- Dashboard parallel fetch on load
- Auto-refresh timer per widget

**Phase 3 — AI Analysis**
- `groq.service.ts` — proxy calls with streaming support
- `ai-analysis-panel.component` — all 4 analysis modes wired
- Rate limit error handling and upgrade prompts

**Phase 4 — Persistence & Polish**
- Drag-and-drop layout save/restore
- Project CRUD fully persisted
- Theme preferences persisted
- PDF export via browser print API
- All loading skeletons and error states implemented

---

## 17. Testing Requirements

- Unit tests for all services — especially `crypto.service` (test encrypt/decrypt round-trip and key derivation consistency)
- Unit tests for data mapping logic in `api-fetch.service`
- Component tests for `widget-shell` — verify correct visualization rendered per type
- E2E tests for critical flows: signup → create project → add widget → view dashboard → trigger AI analysis

---

## 18. Things You Must Never Do

- **Never call external APIs directly from a component** — always go through a service
- **Never store plaintext API keys** in localStorage, sessionStorage, or any persistent store
- **Never call Groq directly from the browser** — always proxy through the backend
- **Never use `any` type** — TypeScript strict mode is on
- **Never bypass Angular's XSS protection** without explicit approval
- **Never add new dependencies** without stating the reason and waiting for confirmation
- **Never hardcode API URLs** — use environment files (`environment.ts` / `environment.prod.ts`)
- **Never write business logic in templates** — move it to the component class
- **Never ignore error states** — every async operation has loading, error, and success states

---

*PulseGrid — Unified Intelligence. Zero Overhead.*
*This document is the single source of truth. When in doubt, re-read it.*
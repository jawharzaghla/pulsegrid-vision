# PulseGrid Vision

> **Unified Intelligence. Zero Overhead.**

PulseGrid is a SaaS Business Intelligence platform for multi-business operators. Connect any REST API, configure a widget, and get a live, AI-enriched dashboard in one unified workspace.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Styling | Tailwind CSS |
| Charting | Recharts |
| AI Engine | OpenRouter API (auto model selection) |
| Auth | Firebase Auth |
| Database | Cloud Firestore |
| Backend | Express.js (AI proxy + auth) |

## Getting Started

### 1. Install Dependencies

```bash
npm install
cd server && npm install && cd ..
```

### 2. Configure Environment

Copy `.env` and fill in your values:

```bash
# Required
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=openrouter/auto
```

### 3. Seed Demo Data

```bash
node server/seed-demo.js
```

This fetches real data from CoinGecko, Open-Meteo, and REST Countries APIs, then creates demo projects in Firestore.

### 4. Run Development Server

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend proxy
cd server && node index.js
```

## Demo Pages

The platform includes pre-configured demo dashboards accessible without authentication:

| Route | Tier | Content |
|---|---|---|
| `/demo/free` | Free | 1 project, 5 widgets (crypto market data) |
| `/demo/pro` | Pro | 3 projects (crypto + weather + world data) |
| `/demo/business` | Business | 3 projects with full feature access |

Demo data is seeded from real public APIs and stored in Firestore.

## Project Structure

```
src/
├── components/       # Shared & feature components
│   ├── dashboard/    # Dashboard-specific (AI panel, widget drawer)
│   ├── landing/      # Landing page sections
│   └── ui/           # shadcn/ui primitives
├── config/           # Demo IDs, constants
├── contexts/         # Auth & Demo contexts
├── lib/              # Firebase config, utilities
├── pages/            # Route-level page components
├── services/         # API fetch, AI, auth, Firestore
└── types/            # TypeScript models

server/
├── index.js          # Express backend (OpenRouter AI proxy)
├── auth.js           # Firebase auth token exchange
├── admin.js          # Admin dashboard endpoints
├── prompts.js        # AI system/user prompt builders
└── seed-demo.js      # Demo data seeding script
```

## SaaS Tiers

| Limit | Free | Pro | Business |
|---|---|---|---|
| Projects | 2 | 10 | Unlimited |
| Widgets / project | 5 | 25 | Unlimited |
| AI analyses / day | 5 | 100 | Unlimited |
| Refresh interval | Manual | 30s | Real-time |
| Team members | 1 | 3 | 15 |

## Architecture

- **AI requests** are proxied through the Express backend → OpenRouter API. The API key never reaches the browser.
- **Widget data** is fetched directly from user-configured REST APIs (browser → API).
- **Credentials** are encrypted client-side with AES-GCM 256-bit before storage.
- **Demo pages** use public APIs (no auth required) with cached payloads for reliability.

---

*PulseGrid — Unified Intelligence. Zero Overhead.*

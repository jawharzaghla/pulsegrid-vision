// ============================================
// PulseGrid — Demo Project Configurations
// Inline configs for demo pages (no Firestore read needed)
// Live data fetched from public APIs at runtime
// ============================================

import type { Project, Widget } from '@/types/models';

function makeWidget(
  id: string, projectId: string, title: string, endpointUrl: string,
  visualization: string, mapperType: string, primaryPath: string = '',
  color: string = '#7B2FBE'
): Widget {
  return {
    id,
    projectId,
    title,
    endpointUrl,
    authMethod: 'none' as const,
    authConfig: {},
    dataMapping: {
      primaryValuePath: primaryPath || '__demo__',
      labelPath: mapperType,
      aiDescription: `Demo widget: ${title}`,
    },
    visualization,
    displayOptions: {
      unitPrefix: '',
      unitSuffix: '',
      decimalPlaces: 0,
      colorPalette: color,
    },
    refreshInterval: null,
    lastFetchedAt: new Date().toISOString(),
    cachedPayload: null,
    cachedAt: null,
  } as Widget;
}

// =====================
// FREE TIER — 1 project, 5 widgets
// =====================

export const FREE_PROJECT: Project = {
  id: 'demo-free-crypto',
  userId: 'demo-user-free',
  name: 'Crypto Market Tracker',
  description: 'Real-time cryptocurrency market intelligence with live CoinGecko data',
  emoji: '📊',
  accentColor: '#7B2FBE',
  theme: { mode: 'dark', chartPalette: 'default', fontSize: 'comfortable', widgetBorder: 'card' },
  widgets: [
    makeWidget('w-free-btc', 'demo-free-crypto', 'Bitcoin Price',
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      'kpi-card', 'coingecko-simple-price', 'bitcoin', '#F7931A'),
    makeWidget('w-free-eth', 'demo-free-crypto', 'Ethereum Price',
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true',
      'kpi-card', 'coingecko-simple-price', 'ethereum', '#627EEA'),
    makeWidget('w-free-mcap', 'demo-free-crypto', 'Market Cap Distribution',
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&sparkline=false',
      'donut-chart', 'coingecko-markets-donut', '', '#00C9A7'),
    makeWidget('w-free-trend', 'demo-free-crypto', 'BTC 7-Day Trend',
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7',
      'line-chart', 'coingecko-market-chart', '', '#F59E0B'),
    makeWidget('w-free-vol', 'demo-free-crypto', '24h Trading Volume',
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=5&sparkline=false',
      'bar-chart', 'coingecko-markets-volume', '', '#3498DB'),
  ],
  layout: [
    { widgetId: 'w-free-btc', x: 0, y: 0, w: 3, h: 2 },
    { widgetId: 'w-free-eth', x: 3, y: 0, w: 3, h: 2 },
    { widgetId: 'w-free-mcap', x: 6, y: 0, w: 6, h: 3 },
    { widgetId: 'w-free-trend', x: 0, y: 2, w: 6, h: 3 },
    { widgetId: 'w-free-vol', x: 6, y: 3, w: 6, h: 3 },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// =====================
// PRO TIER — 3 projects
// =====================

const PRO_CRYPTO: Project = {
  ...FREE_PROJECT,
  id: 'demo-pro-crypto',
  userId: 'demo-user-pro',
  widgets: FREE_PROJECT.widgets.map(w => ({ ...w, id: w.id.replace('free', 'pro'), projectId: 'demo-pro-crypto' })),
  layout: FREE_PROJECT.layout.map(l => ({ ...l, widgetId: l.widgetId.replace('free', 'pro') })),
};

const PRO_WEATHER: Project = {
  id: 'demo-pro-weather',
  userId: 'demo-user-pro',
  name: 'Weather Analytics',
  description: 'Global weather monitoring powered by Open-Meteo',
  emoji: '🌤️',
  accentColor: '#F59E0B',
  theme: { mode: 'dark', chartPalette: 'default', fontSize: 'comfortable', widgetBorder: 'card' },
  widgets: [
    makeWidget('w-pro-wtemp', 'demo-pro-weather', 'Paris Temperature',
      'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true',
      'kpi-card', 'open-meteo-temperature', '', '#F59E0B'),
    makeWidget('w-pro-whourly', 'demo-pro-weather', 'Hourly Forecast',
      'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&hourly=temperature_2m&forecast_days=1',
      'area-chart', 'open-meteo-hourly-chart', '', '#3498DB'),
    makeWidget('w-pro-wcities', 'demo-pro-weather', 'Global Temperatures',
      'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true',
      'bar-chart', 'open-meteo-cities', '', '#00C9A7'),
  ],
  layout: [
    { widgetId: 'w-pro-wtemp', x: 0, y: 0, w: 4, h: 2 },
    { widgetId: 'w-pro-whourly', x: 4, y: 0, w: 8, h: 3 },
    { widgetId: 'w-pro-wcities', x: 0, y: 2, w: 4, h: 3 },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const PRO_WORLD: Project = {
  id: 'demo-pro-world',
  userId: 'demo-user-pro',
  name: 'World Data Explorer',
  description: 'Country statistics and global demographics from REST Countries API',
  emoji: '🌍',
  accentColor: '#22C55E',
  theme: { mode: 'dark', chartPalette: 'default', fontSize: 'comfortable', widgetBorder: 'card' },
  widgets: [
    makeWidget('w-pro-pop', 'demo-pro-world', 'World Population',
      'https://restcountries.com/v3.1/all?fields=name,population,region,area',
      'kpi-card', 'restcountries-population', '', '#22C55E'),
    makeWidget('w-pro-count', 'demo-pro-world', 'Total Countries',
      'https://restcountries.com/v3.1/all?fields=name',
      'kpi-card', 'restcountries-count', '', '#7B2FBE'),
    makeWidget('w-pro-region', 'demo-pro-world', 'Population by Region',
      'https://restcountries.com/v3.1/all?fields=name,population,region,area',
      'donut-chart', 'restcountries-region-donut', '', '#3498DB'),
    makeWidget('w-pro-area', 'demo-pro-world', 'Largest Countries by Area',
      'https://restcountries.com/v3.1/all?fields=name,population,region,area',
      'bar-chart', 'restcountries-area-bar', '', '#F59E0B'),
  ],
  layout: [
    { widgetId: 'w-pro-pop', x: 0, y: 0, w: 3, h: 2 },
    { widgetId: 'w-pro-count', x: 3, y: 0, w: 3, h: 2 },
    { widgetId: 'w-pro-region', x: 6, y: 0, w: 6, h: 3 },
    { widgetId: 'w-pro-area', x: 0, y: 2, w: 6, h: 3 },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const PRO_PROJECTS: Project[] = [PRO_CRYPTO, PRO_WEATHER, PRO_WORLD];

// =====================
// BUSINESS TIER — same 3 projects under business user
// =====================

const BIZ_CRYPTO: Project = {
  ...PRO_CRYPTO,
  id: 'demo-biz-crypto',
  userId: 'demo-user-business',
  widgets: PRO_CRYPTO.widgets.map(w => ({ ...w, id: w.id.replace('pro', 'biz'), projectId: 'demo-biz-crypto' })),
  layout: PRO_CRYPTO.layout.map(l => ({ ...l, widgetId: l.widgetId.replace('pro', 'biz') })),
};

const BIZ_WEATHER: Project = {
  ...PRO_WEATHER,
  id: 'demo-biz-weather',
  userId: 'demo-user-business',
  widgets: PRO_WEATHER.widgets.map(w => ({ ...w, id: w.id.replace('pro', 'biz'), projectId: 'demo-biz-weather' })),
  layout: PRO_WEATHER.layout.map(l => ({ ...l, widgetId: l.widgetId.replace('pro', 'biz') })),
};

const BIZ_WORLD: Project = {
  ...PRO_WORLD,
  id: 'demo-biz-world',
  userId: 'demo-user-business',
  widgets: PRO_WORLD.widgets.map(w => ({ ...w, id: w.id.replace('pro', 'biz'), projectId: 'demo-biz-world' })),
  layout: PRO_WORLD.layout.map(l => ({ ...l, widgetId: l.widgetId.replace('pro', 'biz') })),
};

export const BUSINESS_PROJECTS: Project[] = [BIZ_CRYPTO, BIZ_WEATHER, BIZ_WORLD];

// =====================
// Helper to find a project by ID across all tiers
// =====================

const ALL_DEMO_PROJECTS = [FREE_PROJECT, ...PRO_PROJECTS, ...BUSINESS_PROJECTS];

export function getDemoProjectById(id: string): Project | undefined {
  return ALL_DEMO_PROJECTS.find(p => p.id === id);
}

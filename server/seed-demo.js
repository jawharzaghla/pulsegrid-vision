// ============================================
// PulseGrid — Demo Data Seeder
// Seeds Firestore with demo projects using real API data
// Run: node server/seed-demo.js
// ============================================

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

const db = admin.firestore();
const PROJECTS = 'projects';

// =====================
// Fetch real data from public APIs
// =====================

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

async function fetchCryptoData() {
  console.log('📡 Fetching CoinGecko data...');

  const [btcPrice, ethPrice, markets, marketChart, volumeMarkets] = await Promise.all([
    fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'),
    fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true'),
    fetchJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&sparkline=false'),
    fetchJSON('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7'),
    fetchJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=5&sparkline=false'),
  ]);

  // BTC KPI
  const btcPayload = {
    widgetTitle: 'Bitcoin Price',
    primaryValue: btcPrice.bitcoin.usd,
    unit: '$',
    trend: parseFloat(btcPrice.bitcoin.usd_24h_change?.toFixed(2) || '0'),
  };

  // ETH KPI
  const ethPayload = {
    widgetTitle: 'Ethereum Price',
    primaryValue: ethPrice.ethereum.usd,
    unit: '$',
    trend: parseFloat(ethPrice.ethereum.usd_24h_change?.toFixed(2) || '0'),
  };

  // Market Cap Donut
  const mcapSeries = markets.map(c => ({
    label: c.name,
    value: Math.round(c.market_cap / 1e9),
  }));
  const totalMcap = markets.reduce((s, c) => s + c.market_cap, 0);
  const donutPayload = {
    widgetTitle: 'Market Cap Distribution',
    primaryValue: `$${(totalMcap / 1e12).toFixed(2)}T`,
    unit: '$',
    series: mcapSeries,
  };

  // 7d Price History Line
  const prices = marketChart.prices || [];
  const step = Math.max(1, Math.floor(prices.length / 12));
  const lineSeries = prices
    .filter((_, i) => i % step === 0)
    .map(p => {
      const d = new Date(p[0]);
      return { label: `${d.getMonth() + 1}/${d.getDate()}`, value: Math.round(p[1]) };
    });
  const latest = prices[prices.length - 1]?.[1] || 0;
  const oldest = prices[0]?.[1] || 1;
  const linePayload = {
    widgetTitle: 'BTC 7-Day Trend',
    primaryValue: Math.round(latest),
    unit: '$',
    trend: parseFloat((((latest - oldest) / oldest) * 100).toFixed(2)),
    series: lineSeries,
  };

  // Volume Bar
  const volSeries = volumeMarkets.map(c => ({
    label: c.name,
    value: Math.round(c.total_volume / 1e9),
  }));
  const totalVol = volumeMarkets.reduce((s, c) => s + c.total_volume, 0);
  const volumePayload = {
    widgetTitle: '24h Trading Volume',
    primaryValue: `$${(totalVol / 1e9).toFixed(1)}B`,
    unit: '$',
    series: volSeries,
  };

  return { btcPayload, ethPayload, donutPayload, linePayload, volumePayload };
}

async function fetchWeatherData() {
  console.log('📡 Fetching Open-Meteo data...');

  const weather = await fetchJSON(
    'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true&hourly=temperature_2m&forecast_days=1'
  );

  const tempPayload = {
    widgetTitle: 'Paris Temperature',
    primaryValue: `${weather.current_weather.temperature}°C`,
    trend: weather.current_weather.windspeed,
  };

  const hourly = weather.hourly;
  const hourlySeries = hourly.time
    .slice(0, 24)
    .filter((_, i) => i % 3 === 0)
    .map((t, i) => ({
      label: new Date(t).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      value: hourly.temperature_2m[i * 3] || 0,
    }));

  const avg = hourly.temperature_2m.slice(0, 24).reduce((s, v) => s + v, 0) / 24;
  const hourlyPayload = {
    widgetTitle: 'Hourly Temperature',
    primaryValue: `${avg.toFixed(1)}°C`,
    unit: '°C',
    series: hourlySeries,
  };

  // Fetch for multiple cities
  const cities = [
    { name: 'New York', lat: 40.71, lon: -74.01 },
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'Tokyo', lat: 35.68, lon: 139.69 },
    { name: 'Sydney', lat: -33.87, lon: 151.21 },
    { name: 'Dubai', lat: 25.20, lon: 55.27 },
  ];

  const cityTemps = await Promise.all(
    cities.map(async c => {
      try {
        const d = await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current_weather=true`);
        return { label: c.name, value: d.current_weather.temperature };
      } catch {
        return { label: c.name, value: 0 };
      }
    })
  );

  const citiesPayload = {
    widgetTitle: 'Global Temperatures',
    primaryValue: `${cityTemps.length} Cities`,
    series: cityTemps,
  };

  return { tempPayload, hourlyPayload, citiesPayload };
}

async function fetchWorldData() {
  console.log('📡 Fetching REST Countries data...');

  const countries = await fetchJSON('https://restcountries.com/v3.1/all?fields=name,population,region,area');

  const totalPop = countries.reduce((s, c) => s + (c.population || 0), 0);
  const popPayload = {
    widgetTitle: 'World Population',
    primaryValue: `${(totalPop / 1e9).toFixed(2)}B`,
    unit: 'people',
  };

  // Region donut
  const regionMap = {};
  countries.forEach(c => {
    if (c.region) regionMap[c.region] = (regionMap[c.region] || 0) + (c.population || 0);
  });
  const regionSeries = Object.entries(regionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: Math.round(value / 1e6) }));

  const regionPayload = {
    widgetTitle: 'Population by Region',
    primaryValue: `${Object.keys(regionMap).length} Regions`,
    series: regionSeries,
  };

  // Area bar
  const sorted = [...countries].sort((a, b) => (b.area || 0) - (a.area || 0));
  const areaSeries = sorted.slice(0, 5).map(c => ({
    label: c.name.common,
    value: Math.round((c.area || 0) / 1000),
  }));

  const areaPayload = {
    widgetTitle: 'Largest Countries',
    primaryValue: areaSeries[0]?.label || 'N/A',
    series: areaSeries,
  };

  // Country count KPI
  const countPayload = {
    widgetTitle: 'Total Countries',
    primaryValue: countries.length,
    unit: 'countries',
  };

  return { popPayload, regionPayload, areaPayload, countPayload };
}

// =====================
// Widget builder helper
// =====================

function makeWidget(id, title, endpointUrl, visualization, cachedPayload, mapperType, primaryPath = '', opts = {}) {
  return {
    id,
    projectId: '', // will be set per project
    title,
    endpointUrl,
    authMethod: 'none',
    authConfig: {},
    dataMapping: {
      primaryValuePath: primaryPath || '__demo__',
      labelPath: mapperType, // we store mapper type here for demo-fetch.service
      aiDescription: `Demo widget: ${title}`,
    },
    visualization,
    displayOptions: {
      unitPrefix: opts.unitPrefix || '',
      unitSuffix: opts.unitSuffix || '',
      decimalPlaces: opts.decimalPlaces ?? 0,
      colorPalette: opts.color || '#7B2FBE',
    },
    refreshInterval: null,
    lastFetchedAt: new Date().toISOString(),
    cachedPayload,
    cachedAt: new Date().toISOString(),
  };
}

// =====================
// Build project documents
// =====================

async function buildFreeProject(cryptoData) {
  const now = new Date().toISOString();
  const widgets = [
    makeWidget('w-free-btc', 'Bitcoin Price',
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      'kpi-card', cryptoData.btcPayload, 'coingecko-simple-price', 'bitcoin', { unitPrefix: '$' }),
    makeWidget('w-free-eth', 'Ethereum Price',
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true',
      'kpi-card', cryptoData.ethPayload, 'coingecko-simple-price', 'ethereum', { unitPrefix: '$' }),
    makeWidget('w-free-mcap', 'Market Cap Distribution',
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&sparkline=false',
      'donut-chart', cryptoData.donutPayload, 'coingecko-markets-donut', '', { color: '#00C9A7' }),
    makeWidget('w-free-trend', 'BTC 7-Day Trend',
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7',
      'line-chart', cryptoData.linePayload, 'coingecko-market-chart', '', { unitPrefix: '$', color: '#F59E0B' }),
    makeWidget('w-free-vol', '24h Trading Volume',
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=5&sparkline=false',
      'bar-chart', cryptoData.volumePayload, 'coingecko-markets-volume', '', { color: '#3498DB' }),
  ];

  widgets.forEach(w => { w.projectId = 'demo-free-crypto'; });

  return {
    userId: 'demo-user-free',
    name: 'Crypto Market Tracker',
    description: 'Real-time cryptocurrency market intelligence with live CoinGecko data',
    emoji: '📊',
    accentColor: '#7B2FBE',
    theme: { mode: 'dark', chartPalette: 'default', fontSize: 'comfortable', widgetBorder: 'card' },
    widgets,
    layout: [
      { widgetId: 'w-free-btc', x: 0, y: 0, w: 3, h: 1 },
      { widgetId: 'w-free-eth', x: 3, y: 0, w: 3, h: 1 },
      { widgetId: 'w-free-mcap', x: 6, y: 0, w: 3, h: 3 },
      { widgetId: 'w-free-trend', x: 0, y: 1, w: 6, h: 2 },
      { widgetId: 'w-free-vol', x: 9, y: 0, w: 3, h: 3 },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

async function buildProWeatherProject(weatherData) {
  const now = new Date().toISOString();
  const widgets = [
    makeWidget('w-pro-wtemp', 'Paris Temperature',
      'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true',
      'kpi-card', weatherData.tempPayload, 'open-meteo-temperature', '', { unitSuffix: '°C' }),
    makeWidget('w-pro-whourly', 'Hourly Forecast',
      'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&hourly=temperature_2m&forecast_days=1',
      'area-chart', weatherData.hourlyPayload, 'open-meteo-hourly-chart', '', { color: '#F59E0B' }),
    makeWidget('w-pro-wcities', 'Global Temperatures',
      'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true',
      'bar-chart', weatherData.citiesPayload, '', '', { color: '#00C9A7' }),
  ];

  widgets.forEach(w => { w.projectId = 'demo-pro-weather'; });

  return {
    userId: 'demo-user-pro',
    name: 'Weather Analytics',
    description: 'Global weather monitoring powered by Open-Meteo',
    emoji: '🌤️',
    accentColor: '#F59E0B',
    theme: { mode: 'dark', chartPalette: 'default', fontSize: 'comfortable', widgetBorder: 'card' },
    widgets,
    layout: [
      { widgetId: 'w-pro-wtemp', x: 0, y: 0, w: 3, h: 1 },
      { widgetId: 'w-pro-whourly', x: 3, y: 0, w: 6, h: 2 },
      { widgetId: 'w-pro-wcities', x: 0, y: 1, w: 3, h: 2 },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

async function buildProWorldProject(worldData) {
  const now = new Date().toISOString();
  const widgets = [
    makeWidget('w-pro-pop', 'World Population',
      'https://restcountries.com/v3.1/all?fields=name,population,region,area',
      'kpi-card', worldData.popPayload, 'restcountries-population'),
    makeWidget('w-pro-region', 'Population by Region',
      'https://restcountries.com/v3.1/all?fields=name,population,region,area',
      'donut-chart', worldData.regionPayload, 'restcountries-region-donut', '', { color: '#22C55E' }),
    makeWidget('w-pro-area', 'Largest Countries by Area',
      'https://restcountries.com/v3.1/all?fields=name,population,region,area',
      'bar-chart', worldData.areaPayload, 'restcountries-area-bar', '', { color: '#3498DB' }),
    makeWidget('w-pro-count', 'Total Countries',
      'https://restcountries.com/v3.1/all?fields=name',
      'kpi-card', worldData.countPayload, ''),
  ];

  widgets.forEach(w => { w.projectId = 'demo-pro-world'; });

  return {
    userId: 'demo-user-pro',
    name: 'World Data Explorer',
    description: 'Country statistics and global demographics from REST Countries API',
    emoji: '🌍',
    accentColor: '#22C55E',
    theme: { mode: 'dark', chartPalette: 'default', fontSize: 'comfortable', widgetBorder: 'card' },
    widgets,
    layout: [
      { widgetId: 'w-pro-pop', x: 0, y: 0, w: 3, h: 1 },
      { widgetId: 'w-pro-count', x: 3, y: 0, w: 3, h: 1 },
      { widgetId: 'w-pro-region', x: 6, y: 0, w: 3, h: 3 },
      { widgetId: 'w-pro-area', x: 0, y: 1, w: 6, h: 2 },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// =====================
// Main Seed Function
// =====================

async function seed() {
  console.log('🌱 PulseGrid Demo Seeder Starting...\n');

  try {
    // Fetch real data from APIs
    const cryptoData = await fetchCryptoData();
    console.log('✅ Crypto data fetched\n');

    // Small delay to avoid CoinGecko rate limiting
    await new Promise(r => setTimeout(r, 1500));

    const weatherData = await fetchWeatherData();
    console.log('✅ Weather data fetched\n');

    const worldData = await fetchWorldData();
    console.log('✅ World data fetched\n');

    // Build project documents
    const freeProject = await buildFreeProject(cryptoData);

    // Pro gets crypto + weather + world
    const proCryptoProject = await buildFreeProject(cryptoData);
    proCryptoProject.userId = 'demo-user-pro';
    proCryptoProject.widgets.forEach(w => { w.projectId = 'demo-pro-crypto'; w.id = w.id.replace('free', 'pro'); });
    proCryptoProject.layout.forEach(l => { l.widgetId = l.widgetId.replace('free', 'pro'); });

    const proWeatherProject = await buildProWeatherProject(weatherData);
    const proWorldProject = await buildProWorldProject(worldData);

    // Business gets all the same projects under business user
    const bizCrypto = JSON.parse(JSON.stringify(proCryptoProject));
    bizCrypto.userId = 'demo-user-business';
    bizCrypto.widgets.forEach(w => { w.projectId = 'demo-biz-crypto'; w.id = w.id.replace('pro', 'biz'); });
    bizCrypto.layout.forEach(l => { l.widgetId = l.widgetId.replace('pro', 'biz'); });

    const bizWeather = JSON.parse(JSON.stringify(proWeatherProject));
    bizWeather.userId = 'demo-user-business';
    bizWeather.widgets.forEach(w => { w.projectId = 'demo-biz-weather'; w.id = w.id.replace('pro', 'biz'); });
    bizWeather.layout.forEach(l => { l.widgetId = l.widgetId.replace('pro', 'biz'); });

    const bizWorld = JSON.parse(JSON.stringify(proWorldProject));
    bizWorld.userId = 'demo-user-business';
    bizWorld.widgets.forEach(w => { w.projectId = 'demo-biz-world'; w.id = w.id.replace('pro', 'biz'); });
    bizWorld.layout.forEach(l => { l.widgetId = l.widgetId.replace('pro', 'biz'); });

    // Write to Firestore using specific doc IDs
    console.log('📝 Writing to Firestore...\n');

    const batch = db.batch();

    const docs = [
      ['demo-free-crypto', freeProject],
      ['demo-pro-crypto', proCryptoProject],
      ['demo-pro-weather', proWeatherProject],
      ['demo-pro-world', proWorldProject],
      ['demo-biz-crypto', bizCrypto],
      ['demo-biz-weather', bizWeather],
      ['demo-biz-world', bizWorld],
    ];

    for (const [docId, data] of docs) {
      const ref = db.collection(PROJECTS).doc(docId);
      batch.set(ref, data, { merge: true });
      console.log(`  📄 ${docId} → "${data.name}" (${data.widgets.length} widgets)`);
    }

    await batch.commit();

    console.log('\n✅ All demo projects seeded successfully!\n');
    console.log('Project IDs:');
    docs.forEach(([id, data]) => {
      console.log(`  ${data.userId} → ${id}`);
    });
    console.log('\n🎉 Done! Demo pages are ready.');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
}

seed();

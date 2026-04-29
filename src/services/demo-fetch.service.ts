// ============================================
// PulseGrid — Demo Data Fetch Service
// Fetches live data from public APIs for demo widgets
// Falls back to cachedPayload if live fetch fails
// ============================================

import type { Widget, CleanedMetricPayload, WidgetError } from '@/types/models';

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch data for a single demo widget from its public API endpoint.
 * Demo widgets use authMethod: 'none' so no credentials needed.
 * Falls back to cachedPayload if the live fetch fails.
 */
export async function fetchDemoWidgetData(
  widget: Widget
): Promise<CleanedMetricPayload> {
  // If we have a cached payload, try live fetch but fall back to cache
  const cached = widget.cachedPayload;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(widget.endpointUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      if (cached) return cached;
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const mapped = await mapDemoResponse(data, widget);
    return mapped;
  } catch (err) {
    // Fall back to cached payload if available
    if (cached) {
      console.log(`[DemoFetch] Live fetch failed for "${widget.title}", using cached data`);
      return cached;
    }
    throw err;
  }
}

/**
 * Fetch data for all demo widgets in parallel.
 */
export async function fetchAllDemoWidgetData(
  widgets: Widget[]
): Promise<Map<string, CleanedMetricPayload | WidgetError>> {
  const results = new Map<string, CleanedMetricPayload | WidgetError>();

  const promises = widgets.map(async (widget) => {
    try {
      const data = await fetchDemoWidgetData(widget);
      results.set(widget.id, data);
    } catch {
      // Use cached payload as last resort
      if (widget.cachedPayload) {
        results.set(widget.id, widget.cachedPayload);
      } else {
        results.set(widget.id, {
          code: 'FETCH_NETWORK_ERROR',
          message: 'Demo data unavailable',
          widgetId: widget.id,
        });
      }
    }
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * Map raw API responses to CleanedMetricPayload based on widget's demoMapper config.
 * Each widget stores its mapping strategy in dataMapping.aiDescription as a JSON string.
 */
async function mapDemoResponse(data: unknown, widget: Widget): Promise<CleanedMetricPayload> {
  const mapperType = widget.dataMapping.labelPath || '';

  switch (mapperType) {
    case 'coingecko-simple-price':
      return mapCoinGeckoSimplePrice(data, widget);
    case 'coingecko-market-chart':
      return mapCoinGeckoMarketChart(data, widget);
    case 'coingecko-markets-donut':
      return mapCoinGeckoMarketsDonut(data, widget);
    case 'coingecko-markets-volume':
      return mapCoinGeckoMarketsVolume(data, widget);
    case 'open-meteo-temperature':
      return mapOpenMeteoTemperature(data, widget);
    case 'open-meteo-hourly-chart':
      return mapOpenMeteoHourlyChart(data, widget);
    case 'open-meteo-cities':
      return await mapOpenMeteoCities(data, widget);
    case 'restcountries-population':
      return mapRestCountriesPopulation(data, widget);
    case 'restcountries-count':
      return mapRestCountriesCount(data, widget);
    case 'restcountries-region-donut':
      return mapRestCountriesRegionDonut(data, widget);
    case 'restcountries-area-bar':
      return mapRestCountriesAreaBar(data, widget);
    default:
      // Generic: try to use cachedPayload or create a basic KPI
      if (widget.cachedPayload) return widget.cachedPayload;
      return {
        widgetTitle: widget.title,
        primaryValue: 'N/A',
      };
  }
}

// =====================
// CoinGecko Mappers
// =====================

function mapCoinGeckoSimplePrice(data: unknown, widget: Widget): CleanedMetricPayload {
  const obj = data as Record<string, Record<string, number>>;
  const coinId = widget.dataMapping.primaryValuePath; // e.g. "bitcoin"
  const coin = obj[coinId];
  if (!coin) return { widgetTitle: widget.title, primaryValue: 'N/A' };

  return {
    widgetTitle: widget.title,
    primaryValue: coin.usd,
    unit: '$',
    trend: coin.usd_24h_change ? parseFloat(coin.usd_24h_change.toFixed(2)) : undefined,
  };
}

function mapCoinGeckoMarketChart(data: unknown, widget: Widget): CleanedMetricPayload {
  const obj = data as { prices?: number[][] };
  if (!obj.prices || !Array.isArray(obj.prices)) {
    return { widgetTitle: widget.title, primaryValue: 'N/A' };
  }

  // Sample down to ~12 points for clean chart
  const prices = obj.prices;
  const step = Math.max(1, Math.floor(prices.length / 12));
  const series = prices
    .filter((_, i) => i % step === 0)
    .map((point) => {
      const date = new Date(point[0]);
      return {
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        value: Math.round(point[1]),
      };
    });

  const latest = prices[prices.length - 1]?.[1] || 0;
  const oldest = prices[0]?.[1] || 1;
  const trend = parseFloat((((latest - oldest) / oldest) * 100).toFixed(2));

  return {
    widgetTitle: widget.title,
    primaryValue: Math.round(latest),
    unit: '$',
    trend,
    series,
  };
}

function mapCoinGeckoMarketsDonut(data: unknown, widget: Widget): CleanedMetricPayload {
  const arr = data as Array<{ name: string; market_cap: number; current_price: number }>;
  if (!Array.isArray(arr)) return { widgetTitle: widget.title, primaryValue: 'N/A' };

  const topCoins = arr.slice(0, 5);
  const series = topCoins.map((coin) => ({
    label: coin.name,
    value: Math.round(coin.market_cap / 1e9), // In billions
  }));

  const totalMcap = topCoins.reduce((sum, c) => sum + c.market_cap, 0);

  return {
    widgetTitle: widget.title,
    primaryValue: `$${(totalMcap / 1e12).toFixed(2)}T`,
    unit: '$',
    series,
  };
}

function mapCoinGeckoMarketsVolume(data: unknown, widget: Widget): CleanedMetricPayload {
  const arr = data as Array<{ name: string; total_volume: number; price_change_percentage_24h: number }>;
  if (!Array.isArray(arr)) return { widgetTitle: widget.title, primaryValue: 'N/A' };

  const topCoins = arr.slice(0, 5);
  const series = topCoins.map((coin) => ({
    label: coin.name,
    value: Math.round(coin.total_volume / 1e9), // In billions
  }));

  const totalVol = topCoins.reduce((sum, c) => sum + c.total_volume, 0);

  return {
    widgetTitle: widget.title,
    primaryValue: `$${(totalVol / 1e9).toFixed(1)}B`,
    unit: '$',
    series,
  };
}

// =====================
// Open-Meteo Mappers
// =====================

function mapOpenMeteoTemperature(data: unknown, widget: Widget): CleanedMetricPayload {
  const obj = data as { current_weather?: { temperature: number; windspeed: number; weathercode: number } };
  if (!obj.current_weather) return { widgetTitle: widget.title, primaryValue: 'N/A' };

  return {
    widgetTitle: widget.title,
    primaryValue: `${obj.current_weather.temperature}°C`,
    trend: obj.current_weather.windspeed,
  };
}

function mapOpenMeteoHourlyChart(data: unknown, widget: Widget): CleanedMetricPayload {
  const obj = data as { hourly?: { time: string[]; temperature_2m: number[] } };
  if (!obj.hourly?.time || !obj.hourly?.temperature_2m) {
    return { widgetTitle: widget.title, primaryValue: 'N/A' };
  }

  // Take every 3rd hour for clean chart
  const series = obj.hourly.time
    .slice(0, 24)
    .filter((_, i) => i % 3 === 0)
    .map((time, i) => ({
      label: new Date(time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      value: obj.hourly!.temperature_2m[i * 3] || 0,
    }));

  const avg = obj.hourly.temperature_2m.slice(0, 24).reduce((s, v) => s + v, 0) / 24;

  return {
    widgetTitle: widget.title,
    primaryValue: `${avg.toFixed(1)}°C`,
    unit: '°C',
    series,
  };
}

async function mapOpenMeteoCities(_data: unknown, widget: Widget): CleanedMetricPayload {
  const cities = [
    { name: 'New York', lat: 40.71, lon: -74.01 },
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'Tokyo', lat: 35.68, lon: 139.69 },
    { name: 'Sydney', lat: -33.87, lon: 151.21 },
    { name: 'Dubai', lat: 25.20, lon: 55.27 },
  ];

  const series = await Promise.all(
    cities.map(async c => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current_weather=true`);
        const d = await r.json();
        return { label: c.name, value: d.current_weather?.temperature || 0 };
      } catch {
        return { label: c.name, value: 0 };
      }
    })
  );

  return {
    widgetTitle: widget.title,
    primaryValue: `${cities.length} Cities`,
    series,
  };
}

// =====================
// REST Countries Mappers
// =====================

function mapRestCountriesPopulation(data: unknown, widget: Widget): CleanedMetricPayload {
  const arr = data as Array<{ name: { common: string }; population: number }>;
  if (!Array.isArray(arr)) return { widgetTitle: widget.title, primaryValue: 'N/A' };

  const totalPop = arr.reduce((sum, c) => sum + (c.population || 0), 0);

  return {
    widgetTitle: widget.title,
    primaryValue: `${(totalPop / 1e9).toFixed(2)}B`,
    unit: 'people',
  };
}

function mapRestCountriesCount(data: unknown, widget: Widget): CleanedMetricPayload {
  const arr = data as Array<unknown>;
  if (!Array.isArray(arr)) return { widgetTitle: widget.title, primaryValue: 'N/A' };

  return {
    widgetTitle: widget.title,
    primaryValue: arr.length,
    unit: 'countries',
  };
}

function mapRestCountriesRegionDonut(data: unknown, widget: Widget): CleanedMetricPayload {
  const arr = data as Array<{ region: string; population: number }>;
  if (!Array.isArray(arr)) return { widgetTitle: widget.title, primaryValue: 'N/A' };

  const regionMap: Record<string, number> = {};
  arr.forEach((c) => {
    if (c.region) {
      regionMap[c.region] = (regionMap[c.region] || 0) + (c.population || 0);
    }
  });

  const series = Object.entries(regionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: Math.round(value / 1e6) }));

  return {
    widgetTitle: widget.title,
    primaryValue: `${Object.keys(regionMap).length} Regions`,
    series,
  };
}

function mapRestCountriesAreaBar(data: unknown, widget: Widget): CleanedMetricPayload {
  const arr = data as Array<{ name: { common: string }; area: number }>;
  if (!Array.isArray(arr)) return { widgetTitle: widget.title, primaryValue: 'N/A' };

  const sorted = [...arr].sort((a, b) => (b.area || 0) - (a.area || 0));
  const top5 = sorted.slice(0, 5);
  const series = top5.map((c) => ({
    label: c.name.common,
    value: Math.round((c.area || 0) / 1000), // thousands km²
  }));

  return {
    widgetTitle: widget.title,
    primaryValue: `${series[0]?.label || 'N/A'}`,
    series,
  };
}

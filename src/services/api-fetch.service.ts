// ============================================
// PulseGrid — API Fetch Service
// REST widget data fetching with credential decryption
// INSTRUCTIONS.md Section 7.1
// ============================================

import { decrypt } from './crypto.service';
import type { Widget, CleanedMetricPayload, WidgetError, WidgetErrorCode } from '@/types/models';

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetch data for a single widget, applying data mapping to return CleanedMetricPayload.
 */
export async function fetchWidgetData(
    widget: Widget,
    cryptoKey: CryptoKey | null
): Promise<CleanedMetricPayload> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        // Build request headers with auth
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };

        if (widget.authMethod !== 'none' && cryptoKey) {
            await applyAuth(headers, widget, cryptoKey);
        }

        const response = await fetch(widget.endpointUrl, {
            headers,
            signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
            throw createWidgetError('FETCH_AUTH_FAILED', 'Authentication failed. Please re-configure your API credentials.', widget.id);
        }

        if (!response.ok) {
            throw createWidgetError('FETCH_NETWORK_ERROR', `Request failed with status ${response.status}`, widget.id);
        }

        let data: unknown;
        try {
            data = await response.json();
        } catch {
            throw createWidgetError('FETCH_PARSE_ERROR', 'Response is not valid JSON.', widget.id);
        }

        // Apply data mapping
        return extractMetrics(data, widget);
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw createWidgetError('FETCH_TIMEOUT', 'Request timed out after 15 seconds.', widget.id);
        }
        if (isWidgetError(err)) throw err;
        throw createWidgetError('FETCH_NETWORK_ERROR', 'Network error. Check your connection.', widget.id);
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Fetch data for all widgets in parallel.
 * One failure does not block the others.
 */
export async function fetchAllWidgetData(
    widgets: Widget[],
    cryptoKey: CryptoKey | null
): Promise<Map<string, CleanedMetricPayload | WidgetError>> {
    const results = new Map<string, CleanedMetricPayload | WidgetError>();

    const promises = widgets.map(async (widget) => {
        try {
            const data = await fetchWidgetData(widget, cryptoKey);
            results.set(widget.id, data);
        } catch (err) {
            if (isWidgetError(err)) {
                results.set(widget.id, err);
            } else {
                results.set(widget.id, createWidgetError('FETCH_NETWORK_ERROR', 'Unknown error', widget.id));
            }
        }
    });

    await Promise.allSettled(promises);
    return results;
}

// =====================
// Auth header helpers
// =====================

async function applyAuth(
    headers: Record<string, string>,
    widget: Widget,
    cryptoKey: CryptoKey
): Promise<void> {
    switch (widget.authMethod) {
        case 'api-key': {
            const headerName = widget.authConfig.headerName || 'X-API-Key';
            const apiKey = await decrypt(widget.authConfig.encryptedKey || '', cryptoKey);
            headers[headerName] = apiKey;
            break;
        }
        case 'bearer': {
            const token = await decrypt(widget.authConfig.encryptedToken || '', cryptoKey);
            headers['Authorization'] = `Bearer ${token}`;
            break;
        }
        case 'basic': {
            const username = await decrypt(widget.authConfig.encryptedUsername || '', cryptoKey);
            const password = await decrypt(widget.authConfig.encryptedPassword || '', cryptoKey);
            headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
            break;
        }
    }
}

// =====================
// Data mapping
// =====================

/**
 * Extract values from raw API response using the widget's DataMapping paths.
 */
function extractMetrics(data: unknown, widget: Widget): CleanedMetricPayload {
    const primaryValue = getNestedValue(data, widget.dataMapping.primaryValuePath);
    const label = widget.dataMapping.labelPath
        ? getNestedValue(data, widget.dataMapping.labelPath)
        : undefined;
    const secondaryValue = widget.dataMapping.secondaryValuePath
        ? getNestedValue(data, widget.dataMapping.secondaryValuePath)
        : undefined;

    // Extract series data if path is provided
    let series: Array<{ label: string; value: number }> | undefined;
    if (widget.dataMapping.seriesPath) {
        const rawSeries = getNestedValue(data, widget.dataMapping.seriesPath);
        if (Array.isArray(rawSeries)) {
            series = rawSeries.map((item: Record<string, unknown>) => ({
                label: String(item.label ?? item.name ?? ''),
                value: Number(item.value ?? item.count ?? 0),
            }));
        }
    }

    return {
        widgetTitle: widget.title,
        primaryValue: primaryValue != null ? primaryValue : 'N/A',
        unit: widget.displayOptions.unitPrefix || widget.displayOptions.unitSuffix || undefined,
        trend: typeof secondaryValue === 'number' ? secondaryValue : undefined,
        series,
    };
}

/**
 * Traverse a nested object using a dot-separated path.
 * e.g. "data.revenue.total" → obj.data.revenue.total
 */
function getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
        if (current == null || typeof current !== 'object') return undefined;
        return (current as Record<string, unknown>)[key];
    }, obj);
}

// =====================
// Error helpers
// =====================

function createWidgetError(code: WidgetErrorCode, message: string, widgetId: string): WidgetError {
    return { code, message, widgetId };
}

function isWidgetError(err: unknown): err is WidgetError {
    return typeof err === 'object' && err !== null && 'code' in err && 'widgetId' in err;
}

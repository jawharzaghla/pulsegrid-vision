// ============================================
// PulseGrid — API Fetch Service
// REST widget data fetching with credential decryption
// INSTRUCTIONS.md Section 7.1
// ============================================

import { decrypt } from './crypto.service';
import { extractWithAI } from './groq.service';
import { updateWidgetCache } from './firestore.service';
import { isJsonLarge, refactorLargeJson } from '@/lib/json-refactor';
import type { Widget, CleanedMetricPayload, WidgetError, WidgetErrorCode } from '@/types/models';

const FETCH_TIMEOUT_MS = 15_000;
const TEST_TIMEOUT_MS = 10_000;

// =====================
// Shared auth header builder
// Used by both fetchWidgetData and testConnection
// =====================

export async function buildAuthHeaders(
    authMethod: Widget['authMethod'],
    credentials: Record<string, string>,
    cryptoKey: CryptoKey | null,
    isEncrypted: boolean
): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };

    if (authMethod === 'none') return headers;

    const canDecrypt = isEncrypted && !!cryptoKey;

    switch (authMethod) {
        case 'api-key': {
            const hName = (credentials.headerName || credentials.apiKeyHeader || 'X-API-Key').trim();
            let key = '';

            if (canDecrypt && credentials.encryptedKey) {
                key = await decrypt(credentials.encryptedKey, cryptoKey!);
            } else {
                key = credentials.key || credentials.apiKeyValue || credentials.encryptedKey || '';
            }

            const apiKey = key.trim();
            console.log(`[buildAuthHeaders] api-key: header=${hName}, hasKey=${!!apiKey}, canDecrypt=${canDecrypt}`);
            if (apiKey) headers[hName] = apiKey;
            break;
        }
        case 'bearer': {
            let token = '';
            if (canDecrypt && credentials.encryptedToken) {
                token = await decrypt(credentials.encryptedToken, cryptoKey!);
            } else {
                token = credentials.token || credentials.bearerToken || credentials.encryptedToken || '';
            }

            const authToken = token.trim();
            console.log(`[buildAuthHeaders] bearer: hasToken=${!!authToken}, canDecrypt=${canDecrypt}`);
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
            break;
        }
        case 'basic': {
            let user = '';
            let pass = '';
            if (canDecrypt && credentials.encryptedUsername) {
                user = await decrypt(credentials.encryptedUsername, cryptoKey!);
                pass = await decrypt(credentials.encryptedPassword || '', cryptoKey!);
            } else {
                user = credentials.username || credentials.basicUsername || '';
                pass = credentials.password || credentials.basicPassword || '';
            }

            const username = user.trim();
            const password = pass.trim();
            console.log(`[buildAuthHeaders] basic: hasUser=${!!username}, canDecrypt=${canDecrypt}`);
            if (username) headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
            break;
        }
    }

    console.log('[buildAuthHeaders] Generated headers:', Object.keys(headers));
    return headers;
}

// =====================
// Test Connection (Add Widget Step 1)
// =====================

export interface TestConnectionResult {
    ok: boolean;
    status: number;
    statusText: string;
    rawJson: unknown | null;
    errorSnippet?: string;
}

export async function testConnection(
    url: string,
    authMethod: Widget['authMethod'],
    credentials: Record<string, string>,
    cryptoKey: CryptoKey | null
): Promise<TestConnectionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

    try {
        const headers = await buildAuthHeaders(authMethod, credentials, cryptoKey, false);

        const response = await fetch(url, {
            headers,
            signal: controller.signal,
        });

        const text = await response.text();

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                statusText: response.statusText,
                rawJson: null,
                errorSnippet: text.slice(0, 200),
            };
        }

        let rawJson: unknown;
        try {
            rawJson = JSON.parse(text);
        } catch {
            return {
                ok: false,
                status: response.status,
                statusText: 'NOT_JSON',
                rawJson: null,
            };
        }

        return {
            ok: true,
            status: response.status,
            statusText: response.statusText,
            rawJson,
        };
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            return { ok: false, status: 0, statusText: 'TIMEOUT', rawJson: null };
        }
        return { ok: false, status: 0, statusText: 'NETWORK_ERROR', rawJson: null };
    } finally {
        clearTimeout(timeout);
    }
}

// =====================
// Widget data fetching
// =====================

/**
 * Fetch data for a single widget, applying data mapping to return CleanedMetricPayload.
 * For AI-extracted widgets: returns Firestore-cached payload if available.
 * Only calls Groq when forceAI=true (explicit user action).
 */
export async function fetchWidgetData(
    widget: Widget,
    cryptoKey: CryptoKey | null,
    forceAI: boolean = false
): Promise<CleanedMetricPayload> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        // AI-extracted widgets: use cached payload from Firestore unless forced
        if (widget.dataMapping.primaryValuePath === '__ai_extracted__' && widget.dataMapping.aiDescription) {

            // Return Firestore cached payload on normal load (no Groq call)
            if (!forceAI && widget.cachedPayload) {
                console.log(`[fetchWidgetData] Using Firestore-cached AI payload for "${widget.title}" (cached at ${widget.cachedAt})`);
                return widget.cachedPayload;
            }

            // If forced or no cache: fetch fresh API data and run AI extraction
            console.log(`[fetchWidgetData] ${forceAI ? 'Force re-extracting' : 'No cache, extracting'} AI data for "${widget.title}"`);

            const headers = await buildAuthHeaders(widget.authMethod, widget.authConfig, cryptoKey, true);
            const response = await fetch(widget.endpointUrl, { headers, signal: controller.signal });

            if (response.status === 401 || response.status === 403) {
                throw createWidgetError('FETCH_AUTH_FAILED', 'Authentication failed. Please re-configure your API credentials.', widget.id);
            }
            if (!response.ok) {
                throw createWidgetError('FETCH_NETWORK_ERROR', `Request failed with status ${response.status}`, widget.id);
            }

            let data: unknown;
            try { data = await response.json(); } catch {
                throw createWidgetError('FETCH_PARSE_ERROR', 'Response is not valid JSON.', widget.id);
            }

            let payloadToExtract = data;
            if (isJsonLarge(payloadToExtract)) {
                console.log(`[fetchWidgetData] Large JSON detected for "${widget.title}", applying auto-refactor...`);
                const { refactoredData } = refactorLargeJson(payloadToExtract);
                payloadToExtract = refactoredData;
            }

            const extractedPayload = await extractWithAI(payloadToExtract, widget.dataMapping.aiDescription);

            // Persist to Firestore in background (fire-and-forget)
            updateWidgetCache(widget.projectId, widget.id, extractedPayload).catch((err) => {
                console.warn('[fetchWidgetData] Failed to persist AI cache to Firestore:', err);
            });

            return extractedPayload;
        }

        // Standard (non-AI) widgets: always fetch fresh data
        console.log('[fetchWidgetData] Widget:', widget.title, 'authMethod:', widget.authMethod);
        const headers = await buildAuthHeaders(widget.authMethod, widget.authConfig, cryptoKey, true);

        const response = await fetch(widget.endpointUrl, { headers, signal: controller.signal });

        if (response.status === 401 || response.status === 403) {
            throw createWidgetError('FETCH_AUTH_FAILED', 'Authentication failed. Please re-configure your API credentials.', widget.id);
        }
        if (!response.ok) {
            throw createWidgetError('FETCH_NETWORK_ERROR', `Request failed with status ${response.status}`, widget.id);
        }

        let data: unknown;
        try { data = await response.json(); } catch {
            throw createWidgetError('FETCH_PARSE_ERROR', 'Response is not valid JSON.', widget.id);
        }

        return extractMetrics(data, widget);
    } catch (err: any) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw createWidgetError('FETCH_TIMEOUT', 'Request timed out after 15 seconds.', widget.id);
        }
        if (isWidgetError(err)) throw err;
        if (err instanceof Error && (err.name === 'AIError' || err.name === 'JSONRefactorError')) {
            throw createWidgetError('FETCH_PARSE_ERROR', err.message, widget.id);
        }
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
    cryptoKey: CryptoKey | null,
    forceAI: boolean = false
): Promise<Map<string, CleanedMetricPayload | WidgetError>> {
    const results = new Map<string, CleanedMetricPayload | WidgetError>();

    const promises = widgets.map(async (widget) => {
        try {
            const data = await fetchWidgetData(widget, cryptoKey, forceAI);
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
// Data mapping
// =====================

function extractMetrics(data: unknown, widget: Widget): CleanedMetricPayload {
    const primaryValue = getNestedValue(data, widget.dataMapping.primaryValuePath);
    const label = widget.dataMapping.labelPath
        ? getNestedValue(data, widget.dataMapping.labelPath)
        : undefined;
    const secondaryValue = widget.dataMapping.secondaryValuePath
        ? getNestedValue(data, widget.dataMapping.secondaryValuePath)
        : undefined;

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
        primaryValue: (primaryValue != null ? primaryValue : 'N/A') as string | number,
        unit: widget.displayOptions.unitPrefix || widget.displayOptions.unitSuffix || undefined,
        trend: typeof secondaryValue === 'number' ? secondaryValue : undefined,
        series,
    };
}

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

// ============================================
// PulseGrid — Groq AI Service
// Calls backend proxy → Groq API
// INSTRUCTIONS.md Section 9
// ============================================

import type { AnalysisRequest, AnalysisMode, CleanedMetricPayload } from '@/types/models';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface AIResponse {
    content: string;
    model: string;
    tokensUsed: number;
}

/**
 * Send an analysis request to the Groq backend proxy.
 */
export async function analyzeWithAI(request: AnalysisRequest): Promise<AIResponse> {
    const res = await fetch(`${API_BASE}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (res.status === 429) {
        throw new AIError('RATE_LIMITED', 'AI rate limit reached. Upgrade to Pro for more analyses.');
    }

    if (!res.ok) {
        throw new AIError('UNAVAILABLE', `AI service error: ${res.status}`);
    }

    return res.json();
}

/**
 * AI Data Extraction — sends raw JSON + user description to
 * the backend /api/ai/extract endpoint. Returns a typed CleanedMetricPayload.
 * Used by the Add Widget flow (Step 2) and widget refresh for AI-extracted widgets.
 */
export async function extractWithAI(
    rawJson: unknown,
    description: string
): Promise<CleanedMetricPayload> {
    const res = await fetch(`${API_BASE}/ai/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawJson, description }),
    });

    if (res.status === 429) {
        throw new AIError('RATE_LIMITED', 'Quota IA journalier atteint.');
    }

    if (res.status === 422) {
        const body = await res.json().catch(() => ({})) as Record<string, string>;
        if (body.code === 'METRIC_NOT_FOUND') {
            throw new AIError('METRIC_NOT_FOUND', "L'IA n'a pas trouvé cette métrique.");
        }
        throw new AIError('EXTRACTION_FAILED', "Erreur d'extraction IA.");
    }

    if (!res.ok) {
        throw new AIError('UNAVAILABLE', `AI service error: ${res.status}`);
    }

    const payload: CleanedMetricPayload = await res.json();
    return payload;
}

/**
 * Build analysis request payloads from widget data.
 */
export function buildAnalysisRequest(
    projectId: string,
    mode: AnalysisMode,
    widgetPayloads: CleanedMetricPayload[],
    question?: string
): AnalysisRequest {
    return {
        projectId,
        mode,
        widgetData: widgetPayloads,
        question: mode === 'ask' ? question : undefined,
    };
}

// =====================
// Error types
// =====================

export type AIErrorCode = 'RATE_LIMITED' | 'UNAVAILABLE' | 'METRIC_NOT_FOUND' | 'EXTRACTION_FAILED';

export class AIError extends Error {
    constructor(
        public code: AIErrorCode,
        message: string
    ) {
        super(message);
        this.name = 'AIError';
    }
}

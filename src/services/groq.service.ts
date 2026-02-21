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
 * Send an AI analysis request to the backend proxy.
 * The backend proxy forwards it to Groq.
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

/**
 * Generate a client-side analysis summary when backend is unavailable.
 * This provides a basic fallback when the Groq proxy isn't running.
 */
export function generateLocalAnalysis(
    mode: AnalysisMode,
    widgetPayloads: CleanedMetricPayload[],
    question?: string
): string {
    if (widgetPayloads.length === 0) {
        return "No widget data available for analysis. Add widgets with live data to enable AI insights.";
    }

    const summaryLines = widgetPayloads.map((w) => {
        const trend = w.trend != null ? ` (${w.trend > 0 ? '+' : ''}${w.trend}%)` : '';
        return `• **${w.widgetTitle}**: ${w.primaryValue}${w.unit ? ` ${w.unit}` : ''}${trend}`;
    });

    switch (mode) {
        case 'project-brief':
            return `## Project Brief\n\nBased on ${widgetPayloads.length} connected widgets:\n\n${summaryLines.join('\n')}\n\n*Connect the Groq backend proxy for deeper AI analysis.*`;
        case 'widget':
            return `## Widget Analysis\n\n${summaryLines.join('\n')}\n\n*Connect the Groq backend proxy for trends, anomalies, and recommendations.*`;
        case 'daily-brief':
            return `## Daily Brief\n\nToday's metrics overview:\n\n${summaryLines.join('\n')}\n\n*Connect the Groq backend proxy for predictive insights.*`;
        case 'ask':
            return `You asked: "${question}"\n\nAvailable data:\n${summaryLines.join('\n')}\n\n*Connect the Groq backend proxy for AI-powered answers.*`;
        default:
            return summaryLines.join('\n');
    }
}

// =====================
// Error types
// =====================

export class AIError extends Error {
    constructor(
        public code: 'RATE_LIMITED' | 'UNAVAILABLE',
        message: string
    ) {
        super(message);
        this.name = 'AIError';
    }
}

// ============================================
// PulseGrid — Express Backend Proxy
// Thin server for Groq AI requests
// Keeps GROQ_API_KEY server-side only
// ============================================

import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:8080', 'http://localhost:5173'] }));
app.use(express.json());

// Init Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// =====================
// AI Analysis endpoint
// =====================
app.post('/api/ai/analyze', async (req, res) => {
    try {
        const { mode, widgetData, question } = req.body;

        if (!widgetData || !Array.isArray(widgetData)) {
            return res.status(400).json({ error: 'widgetData is required and must be an array' });
        }

        const systemPrompt = buildSystemPrompt(mode);
        const userPrompt = buildUserPrompt(mode, widgetData, question);

        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1024,
        });

        const content = completion.choices[0]?.message?.content || 'No analysis generated.';
        const tokensUsed = completion.usage?.total_tokens || 0;

        res.json({ content, model: MODEL, tokensUsed });
    } catch (err) {
        console.error('Groq API error:', err);
        if (err?.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }
        res.status(500).json({ error: 'AI analysis failed' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: MODEL });
});

app.listen(PORT, () => {
    console.log(`🧠 PulseGrid AI Proxy running on http://localhost:${PORT}`);
});

// =====================
// Prompt builders
// =====================
function buildSystemPrompt(mode) {
    const base = 'You are an expert BI analyst for PulseGrid. Analyze the provided business metrics and give actionable insights. Use markdown formatting for clarity. Be concise but thorough.';

    switch (mode) {
        case 'project-brief':
            return `${base} Provide a comprehensive project brief with key findings, trends, and strategic recommendations.`;
        case 'widget':
            return `${base} Analyze individual widget metrics in detail. Identify anomalies, patterns, and correlations.`;
        case 'daily-brief':
            return `${base} Provide a concise daily brief highlighting the most important changes and action items for today.`;
        case 'ask':
            return `${base} Answer the user's specific question about their data. If you are unsure, say so.`;
        default:
            return base;
    }
}

function buildUserPrompt(mode, widgetData, question) {
    const dataBlock = widgetData.map((w) => {
        const trend = w.trend != null ? ` (trend: ${w.trend > 0 ? '+' : ''}${w.trend}%)` : '';
        const unit = w.unit ? ` ${w.unit}` : '';
        return `- ${w.widgetTitle}: ${w.primaryValue}${unit}${trend}`;
    }).join('\n');

    if (mode === 'ask' && question) {
        return `Here is my current data:\n${dataBlock}\n\nMy question: ${question}`;
    }

    return `Here is the current data from my dashboard:\n${dataBlock}\n\nPlease analyze these metrics.`;
}

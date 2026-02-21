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

import { buildSystemPrompt, buildUserPrompt, EXTRACT_SYSTEM_PROMPT, buildExtractUserPrompt } from './prompts.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Root route
app.get('/', (req, res) => {
    res.send('<h1>PulseGrid AI Proxy</h1><p>Endpoints: POST /api/ai/analyze, POST /api/ai/extract</p>');
});

// Init Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// =====================
// AI Analysis endpoint
// =====================
app.post('/api/ai/analyze', async (req, res) => {
    console.log('--- AI Analysis Request Received ---');
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

// =====================
// AI Data Extraction endpoint (Add Widget flow)
// =====================
app.post('/api/ai/extract', async (req, res) => {
    console.log('--- AI Extract Request Received ---');
    try {
        const { rawJson, description } = req.body;

        if (!rawJson) {
            return res.status(400).json({ error: 'rawJson is required' });
        }
        if (!description || typeof description !== 'string' || !description.trim()) {
            return res.status(400).json({ error: 'description is required' });
        }

        const rawJsonString = typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson, null, 2);
        const userPrompt = buildExtractUserPrompt(rawJsonString, description.trim());

        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 500,
        });

        const content = completion.choices[0]?.message?.content || '';
        console.log('Groq extract raw response:', content);

        // Validate that the response is parseable JSON
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch {
            console.error('Groq returned non-JSON response:', content);
            return res.status(422).json({ code: 'EXTRACTION_FAILED' });
        }

        // Check if Groq reported metric not found
        if (parsed.error === 'metric_not_found') {
            return res.status(422).json({ code: 'METRIC_NOT_FOUND' });
        }

        // Validate the shape has at minimum a primaryValue
        if (parsed.primaryValue === undefined && parsed.primaryValue === null) {
            console.error('Groq response missing primaryValue:', parsed);
            return res.status(422).json({ code: 'EXTRACTION_FAILED' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Groq Extract error:', err);
        if (err?.status === 429) {
            return res.status(429).json({ code: 'RATE_LIMITED' });
        }
        res.status(500).json({ code: 'EXTRACTION_FAILED' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: MODEL });
});

app.listen(PORT, () => {
    console.log(`🧠 PulseGrid AI Proxy running on http://localhost:${PORT}`);
});

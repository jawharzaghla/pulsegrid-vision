// ============================================
// PulseGrid — Express Backend Proxy
// Thin server for AI requests via OpenRouter
// Keeps OPENROUTER_API_KEY server-side only
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
console.log('--- Loading .env from:', path.join(__dirname, '../.env'));

if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY is missing. AI calls will fail; please set OPENROUTER_API_KEY in .env.');
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    console.log('--- Firebase Admin: Checking Configuration ---');
    const serviceAccount = {
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    console.log('Project ID:', serviceAccount.projectId || 'MISSING');
    console.log('Client Email:', serviceAccount.clientEmail || 'MISSING');
    console.log('Private Key Loaded:', serviceAccount.privateKey ? 'YES (starts with ' + serviceAccount.privateKey.substring(0, 20) + '...)' : 'NO');

    if (serviceAccount.clientEmail && serviceAccount.privateKey) {
        console.log('--- Initializing Firebase Admin with service account from ENV ---');
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.projectId,
            });
        } catch (err) {
            console.error('ERROR: Firebase Admin initialization failed:', err.message);
        }
    } else {
        console.log('--- Firebase Admin Fallback: Missing Service Account Credentials ---');
        console.log('To use the admin dashboard, you MUST add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your .env file.');

        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            });
            console.log('Firebase Admin initialized with ADC.');
        } catch (err) {
            console.warn('Firebase Admin ADC initialization failed (expected if not on GCP).');
        }
    }
}

import { buildSystemPrompt, buildUserPrompt, EXTRACT_SYSTEM_PROMPT, buildExtractUserPrompt, SALES_SYSTEM_PROMPT, buildSalesUserPrompt } from './prompts.js';
import authRouter from './auth.js';
import adminRouter from './admin.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Auth routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Root route
app.get('/', (req, res) => {
    res.send('<h1>PulseGrid AI Proxy</h1><p>Endpoints: POST /api/ai/analyze, POST /api/ai/extract</p>');
});

// =====================
// OpenRouter API Helper
// =====================

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'openrouter/auto';

async function callOpenRouter(messages, options = {}, maxRetries = 3) {
    const body = {
        model: AI_MODEL,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? 400,
    };

    if (options.response_format) {
        body.response_format = options.response_format;
    }

    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout per attempt

            const res = await fetch(OPENROUTER_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://pulsegrid.app',
                    'X-Title': 'PulseGrid Vision',
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorText = await res.text().catch(() => '');
                const error = new Error(`OpenRouter API error: ${res.status} ${errorText}`);
                error.status = res.status;
                
                // Do not retry on client errors (400, 401, 403, 404, 422) except rate limits (429)
                if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                    throw error;
                }
                
                throw error; // Will be caught by the catch block and retried
            }

            return await res.json();
        } catch (err) {
            lastError = err;
            // If it's a fatal error that we re-threw, don't retry
            if (err.status >= 400 && err.status < 500 && err.status !== 429) {
                throw err;
            }
            
            console.warn(`[Attempt ${attempt + 1}/${maxRetries}] OpenRouter call failed:`, err.message);
            
            if (attempt < maxRetries - 1) {
                // Exponential backoff: 1.5s, 3s
                const delay = 1500 * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

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

        const completion = await callOpenRouter([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ], { temperature: 0.2, max_tokens: 400 });

        const content = completion.choices[0]?.message?.content || 'No analysis generated.';
        const tokensUsed = completion.usage?.total_tokens || 0;

        res.json({ content, model: AI_MODEL, tokensUsed });
    } catch (err) {
        console.error('OpenRouter API error:', err);
        const status = err?.status || null;
        const message = (err && err.message) ? err.message : 'AI analysis failed';

        if (status === 401 || status === 403) {
            return res.status(401).json({ error: 'OpenRouter API key unauthorized. Check OPENROUTER_API_KEY.' });
        }
        if (status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        res.status(500).json({ error: `AI analysis failed: ${message}` });
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

        const rawJsonString = typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson);
        const userPrompt = buildExtractUserPrompt(rawJsonString, description.trim());

        const completion = await callOpenRouter([
            { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ], {
            temperature: 0.1,
            max_tokens: 400,
        });

        let content = completion.choices[0]?.message?.content || '';
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        console.log('OpenRouter extract raw response:', content);

        // Validate that the response is parseable JSON
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch {
            console.error('OpenRouter returned non-JSON response:', content);
            return res.status(422).json({ code: 'EXTRACTION_FAILED' });
        }

        // Check if AI reported metric not found
        if (parsed.error === 'metric_not_found') {
            return res.status(422).json({ code: 'METRIC_NOT_FOUND' });
        }

        // Validate the shape has at minimum a primaryValue
        if (parsed.primaryValue === undefined && parsed.primaryValue === null) {
            console.error('OpenRouter response missing primaryValue:', parsed);
            return res.status(422).json({ code: 'EXTRACTION_FAILED' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('OpenRouter Extract error:', err);
        const status = err?.status || null;

        if (status === 429) {
            return res.status(429).json({ code: 'RATE_LIMITED' });
        }
        if (status === 401 || status === 403) {
            return res.status(401).json({ code: 'EXTRACTION_FAILED', error: 'OpenRouter API key unauthorized.' });
        }

        res.status(500).json({ code: 'EXTRACTION_FAILED', error: err?.message || 'Extraction failed' });
    }
});

// =====================
// Sales Chatbot endpoint
// =====================
app.post('/api/ai/sales', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        const userPrompt = buildSalesUserPrompt(message, history || []);

        const completion = await callOpenRouter([
            { role: 'system', content: SALES_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ], { temperature: 0.1, max_tokens: 90 });

        const content = completion.choices[0]?.message?.content || 'I am here to help you scaling your business.';
        const tokensUsed = completion.usage?.total_tokens || 0;

        res.json({ content, model: AI_MODEL, tokensUsed });
    } catch (err) {
        console.error('OpenRouter Sales Chat error:', err);
        const status = err?.status || null;

        if (status === 401 || status === 403) {
            return res.status(401).json({ error: 'OpenRouter API key unauthorized.' });
        }
        if (status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        res.status(500).json({ error: `Failed to reach support: ${err?.message || 'Unknown error'}` });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: AI_MODEL });
});

// Test AI API key
app.get('/api/test-ai', async (req, res) => {
    try {
        console.log('--- Testing OpenRouter API Key ---');

        if (!OPENROUTER_API_KEY) {
            return res.status(500).json({ success: false, error: 'Missing OPENROUTER_API_KEY in environment.' });
        }

        const completion = await callOpenRouter([
            { role: 'user', content: 'Say "Hello, PulseGrid!"' },
        ], { max_tokens: 10 });

        const response = completion.choices[0]?.message?.content || 'No response';
        res.json({ success: true, response, model: AI_MODEL, tokens: completion.usage?.total_tokens });
    } catch (err) {
        const message = err && err.message ? err.message : 'Unknown error';
        console.error('OpenRouter test error:', message, err);
        res.status(500).json({ success: false, error: message });
    }
});

app.listen(PORT, () => {
    console.log(`🧠 PulseGrid AI Proxy running on http://localhost:${PORT}`);
});

// ============================================
// PulseGrid — Express Backend Proxy
// Thin server for Groq AI requests
// Keeps GROQ_API_KEY server-side only
// ============================================

import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
console.log('--- Loading .env from:', path.join(__dirname, '../.env'));

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
import billingRouter from './billing.js';
import adminRouter from './admin.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Webhook route MUST be before express.json()
app.use('/api/billing/webhook', billingRouter);

app.use(express.json({ limit: '2mb' }));

// Auth and Billing routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/billing', (req, res, next) => {
    // Skip /webhook for this middleware as it's already registered above
    if (req.path === '/webhook') return next('router');
    next();
}, billingRouter);


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

        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: SALES_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        const content = completion.choices[0]?.message?.content || 'I am here to help you scaling your business.';
        const tokensUsed = completion.usage?.total_tokens || 0;

        res.json({ content, model: MODEL, tokensUsed });
    } catch (err) {
        console.error('Groq Sales Chat error:', err);
        res.status(500).json({ error: 'Failed to reach support' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: MODEL });
});

app.listen(PORT, () => {
    console.log(`🧠 PulseGrid AI Proxy running on http://localhost:${PORT}`);
});

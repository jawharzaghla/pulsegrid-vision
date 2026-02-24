import express from 'express';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import geoip from 'geoip-lite';

const router = express.Router();

/**
 * Middleware to verify backend JWT
 */
export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
};

/**
 * Middleware to verify admin role
 */
export const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'NOT_ADMIN' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
};

/**
 * Reusable session logger
 */
export async function logSession(userId, email, ipAddress) {
    const ip = ipAddress?.split(',')[0]?.trim() || 'unknown';
    const geo = geoip.lookup(ip);
    try {
        await admin.firestore().collection('user_sessions').add({
            userId,
            email,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            country: geo?.country || 'Unknown',
            timezone: geo?.timezone || null,
        });
    } catch (err) {
        console.error('Failed to log session:', err);
    }
}

/**
 * Exchange Firebase ID Token for Backend JWT
 * This bridges Firebase Auth with our custom tier-based JWT system
 */
router.post('/exchange-token', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID_TOKEN_REQUIRED' });
    }

    try {
        // Verify Firebase ID Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Fetch user profile to get the tier
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const profile = userDoc.exists ? userDoc.data() : { tier: 'free' };
        const tier = profile.tier || 'free';

        // Sign custom backend JWT
        const accessToken = jwt.sign(
            {
                id: uid,
                sub: uid,
                email: decodedToken.email,
                tier: tier,
                iat: Math.floor(Date.now() / 1000),
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Log session asynchronously
        const ip = req.headers['x-forwarded-for'] || req.ip;
        logSession(uid, decodedToken.email, ip);

        res.json({ accessToken, tier });
    } catch (err) {
        console.error('Token exchange error:', err);
        res.status(401).json({ error: 'TOKEN_EXCHANGE_FAILED' });
    }
});

/**
 * Exchange Firebase ID Token for Admin JWT (Hardcoded Admin Only)
 */
router.post('/admin-token', async (req, res) => {
    const { firebaseIdToken } = req.body;

    if (!firebaseIdToken) {
        return res.status(400).json({ error: 'ID_TOKEN_REQUIRED' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        const adminEmail = process.env.ADMIN_EMAIL;

        if (decodedToken.email !== adminEmail) {
            return res.status(403).json({ error: 'NOT_ADMIN' });
        }

        const adminToken = jwt.sign(
            {
                id: decodedToken.uid,
                sub: decodedToken.uid,
                email: decodedToken.email,
                role: 'admin'
            },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        // Log admin session
        const ip = req.headers['x-forwarded-for'] || req.ip;
        logSession(decodedToken.uid, decodedToken.email, ip);

        res.json({ accessToken: adminToken });
    } catch (err) {
        console.error('Admin token error:', err);
        res.status(401).json({ error: 'INVALID_TOKEN' });
    }
});

export default router;

import express from 'express';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import { requireAdmin } from './auth.js';

const router = express.Router();

// Lazy Stripe initialization to avoid ESM hoisting issues with process.env
let _stripe;
const getStripe = () => {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.warn('WARNING: STRIPE_SECRET_KEY is missing. Billing features will be disabled.');
            return null;
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return _stripe;
};

/**
 * GET /api/admin/kpis
 * Platform KPI summary
 */
router.get('/kpis', requireAdmin, async (req, res) => {
    try {
        // 1. User counts by tier
        const usersSnapshot = await admin.firestore().collection('users').get();
        const totalUsers = usersSnapshot.size;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let newUsersLast30Days = 0;
        const usersByTier = { free: 0, pro: 0, business: 0 };

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const tier = data.tier || 'free';
            if (usersByTier[tier] !== undefined) usersByTier[tier]++;

            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            if (createdAt >= thirtyDaysAgo) {
                newUsersLast30Days++;
            }
        });

        // 2. Active projects count
        const projectsSnapshot = await admin.firestore().collection('projects').get();
        const totalActiveProjects = projectsSnapshot.size;

        // 3. MRR from Stripe (active subscriptions)
        let monthlyRecurringRevenue = 0;
        const stripe = getStripe();

        if (stripe) {
            let hasMore = true;
            let startingAfter = undefined;
            while (hasMore) {
                const params = {
                    status: 'active',
                    limit: 100
                };
                if (startingAfter) params.starting_after = startingAfter;

                const subscriptions = await stripe.subscriptions.list(params);

                subscriptions.data.forEach(sub => {
                    const item = sub.items.data[0];
                    if (item && item.price && item.price.unit_amount) {
                        monthlyRecurringRevenue += item.price.unit_amount;
                    }
                });

                hasMore = subscriptions.has_more;
                if (hasMore) {
                    startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
                }
            }
        } else {
            // Mock MRR if Stripe is not configured
            monthlyRecurringRevenue = 1245000; // $12,450.00
        }

        res.json({
            totalUsers,
            newUsersLast30Days,
            totalActiveProjects,
            monthlyRecurringRevenue,
            usersByTier
        });
    } catch (err) {
        console.error('Admin KPIs error:', err);
        res.status(500).json({ error: 'FAILED_TO_FETCH_KPIS', message: err.message });
    }
});

/**
 * GET /api/admin/signups-trend
 * Daily signups (last 30 days)
 */
router.get('/signups-trend', requireAdmin, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // Include today

        const usersSnapshot = await admin.firestore().collection('users')
            .where('createdAt', '>=', thirtyDaysAgo)
            .get();

        const dailyCounts = {};
        // Initialize last 30 days with 0
        for (let i = 0; i < 30; i++) {
            const d = new Date(thirtyDaysAgo);
            d.setDate(d.getDate() + i);
            const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
            dailyCounts[label] = 0;
        }

        usersSnapshot.forEach(doc => {
            const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
            const label = createdAt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
            if (dailyCounts[label] !== undefined) {
                dailyCounts[label]++;
            }
        });

        const series = Object.entries(dailyCounts).map(([label, value]) => ({ label, value }));

        res.json({ series });
    } catch (err) {
        console.error('Signups trend error:', err);
        res.status(500).json({ error: 'FAILED_TO_FETCH_SIGNUPS', message: err.message });
    }
});

/**
 * GET /api/admin/peak-hours
 * Peak usage hours (last 7 days)
 */
router.get('/peak-hours', requireAdmin, async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const sessionsSnapshot = await admin.firestore().collection('user_sessions')
            .where('timestamp', '>=', sevenDaysAgo)
            .get();

        const hourlyCounts = Array(24).fill(0);
        sessionsSnapshot.forEach(doc => {
            const timestamp = doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp);
            const hour = timestamp.getUTCHours();
            hourlyCounts[hour]++;
        });

        const series = hourlyCounts.map((value, hour) => ({
            label: `${hour.toString().padStart(2, '0')}h`,
            value
        }));

        res.json({ series });
    } catch (err) {
        console.error('Peak hours error:', err);
        res.status(500).json({ error: 'FAILED_TO_FETCH_PEAK_HOURS', message: err.message });
    }
});

/**
 * GET /api/admin/user-locations
 * User location (country distribution)
 */
router.get('/user-locations', requireAdmin, async (req, res) => {
    try {
        const sessionsSnapshot = await admin.firestore().collection('user_sessions').get();

        const counts = {};
        sessionsSnapshot.forEach(doc => {
            const country = doc.data().country || 'Unknown';
            counts[country] = (counts[country] || 0) + 1;
        });

        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1]);

        const top5 = sorted.slice(0, 5);
        const othersCount = sorted.slice(5).reduce((acc, curr) => acc + curr[1], 0);

        const series = top5.map(([label, value]) => ({ label, value }));
        if (othersCount > 0) {
            series.push({ label: 'Other', value: othersCount });
        }

        res.json({ series });
    } catch (err) {
        console.error('User locations error:', err);
        res.status(500).json({ error: 'FAILED_TO_FETCH_LOCATIONS', message: err.message });
    }
});

/**
 * GET /api/admin/users
 * List all users with profiles
 */
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const usersSnapshot = await admin.firestore().collection('users').get();
        const users = [];
        usersSnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        res.json({ users });
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'FAILED_TO_FETCH_USERS' });
    }
});

/**
 * POST /api/admin/users/:id/ban
 * Toggle user active status
 */
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { isBanned } = req.body;
    try {
        await admin.firestore().collection('users').doc(id).update({
            isBanned,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Admin ban error:', err);
        res.status(500).json({ error: 'FAILED_TO_BAN_USER' });
    }
});

/**
 * POST /api/admin/users/:id/tier
 * Update user subscription tier
 */
router.post('/users/:id/tier', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { tier } = req.body;
    try {
        await admin.firestore().collection('users').doc(id).update({
            tier,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Admin tier update error:', err);
        res.status(500).json({ error: 'FAILED_TO_UPDATE_TIER' });
    }
});

/**
 * GET /api/admin/projects
 * List all projects across the platform
 */
router.get('/projects', requireAdmin, async (req, res) => {
    try {
        const projectsSnapshot = await admin.firestore().collection('projects').get();
        const projects = [];
        projectsSnapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        res.json({ projects });
    } catch (err) {
        console.error('Admin projects error:', err);
        res.status(500).json({ error: 'FAILED_TO_FETCH_PROJECTS' });
    }
});

/**
 * GET /api/admin/projects/:id
 * Master control: Fetch any project dashboard
 */
router.get('/projects/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const projectDoc = await admin.firestore().collection('projects').doc(id).get();
        if (!projectDoc.exists) {
            return res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
        }
        
        // Fetch widgets for this project
        const widgetsSnapshot = await admin.firestore().collection('widgets').where('projectId', '==', id).get();
        const widgets = [];
        widgetsSnapshot.forEach(doc => {
            widgets.push({ id: doc.id, ...doc.data() });
        });

        res.json({ ...projectDoc.data(), id: projectDoc.id, widgets });
    } catch (err) {
        console.error('Admin project master fetch error:', err);
        res.status(500).json({ error: 'FAILED_TO_FETCH_PROJECT' });
    }
});

export default router;

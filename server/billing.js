import express from 'express';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import { requireAuth } from './auth.js';

const router = express.Router();

let _stripe;
const getStripe = () => {
    if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    return _stripe;
};

// DB Helper Functions
async function getStripeCustomerId(userId) {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    return userDoc.exists ? (userDoc.data().stripe_customer_id || null) : null;
}

async function saveStripeCustomerId(userId, custId) {
    await admin.firestore().collection('users').doc(userId).update({
        stripe_customer_id: custId
    });
}

async function getUserIdByStripeCustomerId(custId) {
    const snapshot = await admin.firestore().collection('users')
        .where('stripe_customer_id', '==', custId)
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].id;
}

async function updateUserTier(userId, tier) {
    await admin.firestore().collection('users').doc(userId).update({
        tier: tier
    });
}

function priceIdToTier(priceId) {
    if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
    if (priceId === process.env.STRIPE_PRICE_BUSINESS) return 'business';
    return 'free';
}

// 1. POST /api/billing/create-checkout-session
router.post('/create-checkout-session', requireAuth, async (req, res) => {
    const { priceId } = req.body;

    const allowedPrices = [process.env.STRIPE_PRICE_PRO, process.env.STRIPE_PRICE_BUSINESS];
    if (!allowedPrices.includes(priceId)) {
        return res.status(400).json({ error: 'INVALID_PRICE' });
    }

    try {
        let stripeCustomerId = await getStripeCustomerId(req.user.id);

        if (!stripeCustomerId) {
            const customer = await getStripe().customers.create({
                email: req.user.email,
                metadata: { pulsegridUserId: req.user.id }
            });
            stripeCustomerId = customer.id;
            await saveStripeCustomerId(req.user.id, stripeCustomerId);
        }

        const session = await getStripe().checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${process.env.STRIPE_PORTAL_RETURN_URL}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.STRIPE_PORTAL_RETURN_URL}`,
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Checkout session error:', err);
        res.status(500).json({ error: 'CHECKOUT_FAILED' });
    }
});

// 2. POST /api/billing/create-portal-session
router.post('/create-portal-session', requireAuth, async (req, res) => {
    try {
        const stripeCustomerId = await getStripeCustomerId(req.user.id);
        if (!stripeCustomerId) {
            return res.status(400).json({ error: 'NO_SUBSCRIPTION' });
        }

        const session = await getStripe().billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: process.env.STRIPE_PORTAL_RETURN_URL,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Portal session error:', err);
        res.status(500).json({ error: 'PORTAL_FAILED' });
    }
});

// 3. POST /api/billing/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = getStripe().webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionChange(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionCancelled(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
        }
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook handler error:', err);
        res.status(500).json({ error: 'WEBHOOK_HANDLER_FAILED' });
    }
});

// Webhook Handlers
async function handleSubscriptionChange(subscription) {
    const customerId = subscription.customer;
    const userId = await getUserIdByStripeCustomerId(customerId);
    if (!userId) return;

    const priceId = subscription.items.data[0].price.id;
    const tier = priceIdToTier(priceId);
    const isActive = ['active', 'trialing'].includes(subscription.status);

    await updateUserTier(userId, isActive ? tier : 'free');
}

async function handleSubscriptionCancelled(subscription) {
    const userId = await getUserIdByStripeCustomerId(subscription.customer);
    if (!userId) return;
    await updateUserTier(userId, 'free');
}

async function handlePaymentFailed(invoice) {
    console.log(`Payment failed for customer ${invoice.customer}`);
}

export default router;

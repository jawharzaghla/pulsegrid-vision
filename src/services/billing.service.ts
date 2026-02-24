// ============================================
// PulseGrid — Billing Service
// Calls backend billing endpoints
// ============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export async function createCheckoutSession(priceId: string, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ priceId }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create checkout session');
    }

    const { url } = await res.json();
    window.location.href = url;
}

export async function createPortalSession(accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/billing/create-portal-session`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create portal session');
    }

    const { url } = await res.json();
    window.location.href = url;
}

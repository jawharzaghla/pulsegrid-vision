// ============================================
// PulseGrid — Demo Project IDs
// These IDs correspond to Firestore documents
// created by server/seed-demo.js
// ============================================

export const DEMO_USER_IDS = {
  free: 'demo-user-free',
  pro: 'demo-user-pro',
  business: 'demo-user-business',
} as const;

// Will be populated after running seed script
// For now, these are placeholder IDs that the seed script will create as doc IDs
export const DEMO_PROJECT_IDS = {
  free: {
    crypto: 'demo-free-crypto',
  },
  pro: {
    crypto: 'demo-pro-crypto',
    weather: 'demo-pro-weather',
    world: 'demo-pro-world',
  },
  business: {
    crypto: 'demo-biz-crypto',
    weather: 'demo-biz-weather',
    world: 'demo-biz-world',
    github: 'demo-biz-github',
    space: 'demo-biz-space',
  },
} as const;

export type DemoTier = 'free' | 'pro' | 'business';

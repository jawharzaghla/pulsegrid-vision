// ============================================
// PulseGrid — Demo Auth Context
// Provides mock auth state for demo pages
// No real Firebase auth required
// ============================================

import { createContext, useContext, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { PulseGridUser } from '@/types/models';

interface DemoAuthContextType {
  firebaseUser: User | null;
  profile: PulseGridUser | null;
  accessToken: string | null;
  tier: 'free' | 'pro' | 'business';
  isAdmin: boolean;
  cryptoKey: CryptoKey | null;
  loading: boolean;
  error: string | null;
  handleSignIn: (email: string, password: string) => Promise<void>;
  handleSignUp: (email: string, password: string, name: string) => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  clearError: () => void;
  isDemo: boolean;
}

const DemoAuthContext = createContext<DemoAuthContextType | undefined>(undefined);

interface DemoProviderProps {
  tier: 'free' | 'pro' | 'business';
  children: ReactNode;
}

export function DemoProvider({ tier, children }: DemoProviderProps) {
  const noop = async () => {};

  const demoProfile: PulseGridUser = {
    id: `demo-user-${tier}`,
    email: `demo-${tier}@pulsegrid.com`,
    name: tier === 'free' ? 'Demo User' : tier === 'pro' ? 'Pro Demo User' : 'Business Demo User',
    tier,
    createdAt: new Date().toISOString(),
  };

  const value: DemoAuthContextType = {
    firebaseUser: null,
    profile: demoProfile,
    accessToken: 'demo-token',
    tier,
    isAdmin: false,
    cryptoKey: null,
    loading: false,
    error: null,
    handleSignIn: noop,
    handleSignUp: async () => {},
    handleGoogleSignIn: noop,
    handleSignOut: async () => {
      window.location.href = '/';
    },
    clearError: () => {},
    isDemo: true,
  };

  return (
    <DemoAuthContext.Provider value={value}>
      {children}
    </DemoAuthContext.Provider>
  );
}

export function useDemoAuth(): DemoAuthContextType {
  const context = useContext(DemoAuthContext);
  if (!context) {
    throw new Error('useDemoAuth must be used within a DemoProvider');
  }
  return context;
}

// Re-export with same name so components can use useAuth() seamlessly
export { DemoAuthContext };

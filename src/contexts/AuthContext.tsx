// ============================================
// PulseGrid — Auth Context
// Provides auth state to entire app via React Context
// Replaces Angular's auth guard + interceptor pattern
// ============================================

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import {
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    onAuthChange,
    getUserProfile,
} from '@/services/auth.service';
import { deriveKey, decodeSalt } from '@/services/crypto.service';
import type { PulseGridUser } from '@/types/models';

interface AuthContextType {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<PulseGridUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [tier, setTier] = useState<'free' | 'pro' | 'business'>('free');
    const [isAdmin, setIsAdmin] = useState(false);
    const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

    const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

    /**
     * Decode JWT role
     */
    const getRoleFromToken = (token: string | null) => {
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role;
        } catch {
            return null;
        }
    };

    /**
     * Exchange Firebase ID token for backend JWT
     */
    const syncBackendAuth = async (user: User) => {
        try {
            const idToken = await user.getIdToken();

            // Branch: Admin vs User
            const endpoint = user.email === ADMIN_EMAIL ? '/auth/admin-token' : '/auth/exchange-token';
            const body = user.email === ADMIN_EMAIL ? { firebaseIdToken: idToken } : { idToken };

            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const data = await res.json();
                setAccessToken(data.accessToken);

                if (user.email === ADMIN_EMAIL) {
                    setIsAdmin(true);
                    setTier('business'); // Admins get business tier capabilities
                } else {
                    setTier(data.tier || 'free');
                    setIsAdmin(false);
                }
                return data;
            }
        } catch (err) {
            console.error('Failed to sync backend auth:', err);
        }
        return null;
    };

    // Listen to Firebase auth state
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            setFirebaseUser(user);
            if (user) {
                try {
                    if (user.email !== ADMIN_EMAIL) {
                        const userProfile = await getUserProfile(user.uid);
                        setProfile(userProfile);
                        if (userProfile?.tier) setTier(userProfile.tier);
                        setIsAdmin(false);
                    } else {
                        setProfile({
                            id: user.uid,
                            email: user.email,
                            name: 'Super Admin',
                            tier: 'business',
                            createdAt: new Date().toISOString()
                        } as PulseGridUser);
                        setIsAdmin(true);
                    }
                    await syncBackendAuth(user);
                } catch {
                    setProfile(null);
                }
            } else {
                setProfile(null);
                setAccessToken(null);
                setTier('free');
                setIsAdmin(false);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleSignIn = async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            const user = await signIn(email, password);
            const userProfile = await getUserProfile(user.uid);
            if (userProfile?.encryptionSalt) {
                const key = await deriveKey(password, decodeSalt(userProfile.encryptionSalt));
                setCryptoKey(key);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Sign in failed';
            setError(formatFirebaseError(message));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (email: string, password: string, name: string) => {
        try {
            setError(null);
            setLoading(true);
            const user = await signUp(email, password, name);
            const userProfile = await getUserProfile(user.uid);
            if (userProfile?.encryptionSalt) {
                const key = await deriveKey(password, decodeSalt(userProfile.encryptionSalt));
                setCryptoKey(key);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Sign up failed';
            setError(formatFirebaseError(message));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            setLoading(true);
            await signInWithGoogle();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Google sign in failed';
            setError(formatFirebaseError(message));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            setProfile(null);
            setCryptoKey(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Sign out failed';
            setError(formatFirebaseError(message));
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider
            value={{
                firebaseUser,
                profile,
                accessToken,
                tier,
                isAdmin,
                cryptoKey,
                loading,
                error,
                handleSignIn,
                handleSignUp,
                handleGoogleSignIn,
                handleSignOut,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

/**
 * Convert Firebase error codes to user-friendly messages.
 */
function formatFirebaseError(message: string): string {
    if (message.includes('auth/email-already-in-use')) return 'This email is already registered.';
    if (message.includes('auth/invalid-email')) return 'Please enter a valid email address.';
    if (message.includes('auth/weak-password')) return 'Password must be at least 6 characters.';
    if (message.includes('auth/user-not-found')) return 'No account found with this email.';
    if (message.includes('auth/wrong-password')) return 'Incorrect password.';
    if (message.includes('auth/invalid-credential')) return 'Invalid email or password.';
    if (message.includes('auth/too-many-requests')) return 'Too many attempts. Please try again later.';
    if (message.includes('auth/popup-closed-by-user')) return 'Google sign-in was cancelled.';
    return message;
}

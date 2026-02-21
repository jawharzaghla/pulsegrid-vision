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
import type { PulseGridUser } from '@/types/models';

interface AuthContextType {
    firebaseUser: User | null;
    profile: PulseGridUser | null;
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Listen to Firebase auth state
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            setFirebaseUser(user);
            if (user) {
                try {
                    const userProfile = await getUserProfile(user.uid);
                    setProfile(userProfile);
                } catch {
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleSignIn = async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            await signIn(email, password);
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
            await signUp(email, password, name);
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

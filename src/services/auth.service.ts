// ============================================
// PulseGrid — Firebase Auth Service
// Wraps Firebase Auth — components never call Firebase directly
// ============================================

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    type User,
    type Unsubscribe,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { PulseGridUser } from '@/types/models';

/**
 * Create a new user with email + password.
 * Also creates a Firestore user profile document.
 */
export async function signUp(
    email: string,
    password: string,
    name: string
): Promise<User> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Set display name on Firebase Auth profile
    await updateProfile(user, { displayName: name });

    // Generate encryption salt on signup
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encryptionSalt = btoa(String.fromCharCode(...salt));

    // Create Firestore user profile
    const userProfile: PulseGridUser = {
        id: user.uid,
        email: user.email ?? email,
        name,
        tier: 'free',
        createdAt: new Date().toISOString(),
        encryptionSalt,
    };
    await setDoc(doc(db, 'users', user.uid), userProfile);

    return user;
}

/**
 * Sign in with email + password.
 */
export async function signIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
}

/**
 * Sign in with Google OAuth popup.
 * Creates a Firestore profile if first-time user.
 */
export async function signInWithGoogle(): Promise<User> {
    const credential = await signInWithPopup(auth, googleProvider);
    const user = credential.user;

    // Check if user profile exists, create if not
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
        const userProfile: PulseGridUser = {
            id: user.uid,
            email: user.email ?? '',
            name: user.displayName ?? 'User',
            tier: 'free',
            createdAt: new Date().toISOString(),
            photoURL: user.photoURL ?? undefined,
        };
        await setDoc(doc(db, 'users', user.uid), userProfile);
    }

    return user;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

/**
 * Get the current Firebase Auth user (synchronous snapshot).
 */
export function getCurrentUser(): User | null {
    return auth.currentUser;
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
}

/**
 * Get the PulseGrid user profile from Firestore.
 */
export async function getUserProfile(uid: string): Promise<PulseGridUser | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    const data = userDoc.data();

    // Ensure all users have a salt (for legacy users)
    if (!data.encryptionSalt) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const encryptionSalt = btoa(String.fromCharCode(...salt));
        await setDoc(doc(db, 'users', uid), { encryptionSalt }, { merge: true });
        data.encryptionSalt = encryptionSalt;
    }

    return data as PulseGridUser;
}

/**
 * Update the user's display name.
 */
export async function updateUserName(name: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    await updateProfile(user, { displayName: name });
    await setDoc(doc(db, 'users', user.uid), { name }, { merge: true });
}

/**
 * Change the user's password (requires re-authentication).
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No authenticated user');

    // Re-authenticate before password change
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
}

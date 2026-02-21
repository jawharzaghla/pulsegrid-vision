// ============================================
// PulseGrid — Typed Encrypted Storage Service
// INSTRUCTIONS.md Section 7.3
// ============================================

import { encrypt, decrypt } from './crypto.service';

/** Canonical localStorage key registry — no magic strings elsewhere. */
export const STORAGE_KEYS = {
    PROJECTS: 'pg_projects',
    WIDGET_LAYOUTS: 'pg_layouts',
    ENCRYPTED_CREDENTIALS: 'pg_creds',
    ENCRYPTION_SALT: 'pg_salt',
    THEME_PREFERENCE: 'pg_theme',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// --- Plain read/write (non-sensitive data) ---

export function readJSON<T>(key: StorageKey): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function writeJSON<T>(key: StorageKey, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: StorageKey): void {
    localStorage.removeItem(key);
}

// --- Encrypted read/write (sensitive data like API keys) ---

export async function readEncrypted<T>(key: StorageKey, cryptoKey: CryptoKey): Promise<T | null> {
    try {
        const ciphertext = localStorage.getItem(key);
        if (!ciphertext) return null;
        const plaintext = await decrypt(ciphertext, cryptoKey);
        return JSON.parse(plaintext) as T;
    } catch {
        return null;
    }
}

export async function writeEncrypted<T>(key: StorageKey, value: T, cryptoKey: CryptoKey): Promise<void> {
    const plaintext = JSON.stringify(value);
    const ciphertext = await encrypt(plaintext, cryptoKey);
    localStorage.setItem(key, ciphertext);
}

// --- Salt persistence ---

export function readSalt(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ENCRYPTION_SALT);
}

export function writeSalt(encodedSalt: string): void {
    localStorage.setItem(STORAGE_KEYS.ENCRYPTION_SALT, encodedSalt);
}

// --- Clear all PulseGrid data ---

export function clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
    });
}

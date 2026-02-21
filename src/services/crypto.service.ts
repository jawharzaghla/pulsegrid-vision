// ============================================
// PulseGrid — Web Crypto Service
// AES-GCM 256-bit encryption for API keys
// INSTRUCTIONS.md Section 5.1
// ============================================

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Generate a random salt for key derivation.
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derive an AES-GCM-256 CryptoKey from a password + salt using PBKDF2.
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a plaintext string with AES-GCM-256.
 * Returns base64-encoded string: [IV (12 bytes) + ciphertext].
 */
export async function encrypt(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
    );

    // Combine IV + ciphertext into a single buffer
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded ciphertext (IV + ciphertext) with AES-GCM-256.
 */
export async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Encode a Uint8Array salt to base64 for localStorage persistence.
 */
export function encodeSalt(salt: Uint8Array): string {
    return btoa(String.fromCharCode(...salt));
}

/**
 * Decode a base64 salt string back to Uint8Array.
 */
export function decodeSalt(encoded: string): Uint8Array {
    return Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
}

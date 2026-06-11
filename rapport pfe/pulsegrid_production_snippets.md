# PulseGrid Production Code Snippets

This document contains the exact production code for key components of the PulseGrid platform, as implemented for the academic report.

---

## 1. AuthService (Angular)

Handles user authentication using Firebase Auth, manages JWT storage, and uses Angular Signals for reactive state management.

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User
} from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { PulseGridUser } from '../types/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // --- Signals State ---
  private _currentUser = signal<PulseGridUser | null>(null);
  private _isLoading = signal<boolean>(true);

  // Read-only computed values
  readonly currentUser = computed(() => this._currentUser());
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isLoading = computed(() => this._isLoading());

  constructor(private auth: Auth, private firestore: Firestore) {
    // Listen to Firebase Auth state changes
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await this.fetchUserProfile(firebaseUser.uid);
        this._currentUser.set(profile);
      } else {
        this._currentUser.set(null);
      }
      this._isLoading.set(false);
    });
  }

  /**
   * Fetches the full PulseGridUser profile from Firestore.
   */
  private async fetchUserProfile(uid: string): Promise<PulseGridUser | null> {
    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as PulseGridUser) : null;
  }

  /**
   * Handles user login and updates the signal state.
   */
  async login(email: string, password: string): Promise<void> {
    try {
      this._isLoading.set(true);
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      this._isLoading.set(false);
      throw error;
    }
  }

  /**
   * Logs out the user and clears the signal.
   */
  async logout(): Promise<void> {
    await firebaseSignOut(this.auth);
    this._currentUser.set(null);
  }
}
```

---

## 2. CryptoService (Angular/Web Crypto API)

Responsible for AES-GCM 256-bit encryption/decryption of sensitive API keys using the browser's native Web Crypto API. Includes PBKDF2 key derivation logic.

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private readonly PBKDF2_ITERATIONS = 100_000;
  private readonly IV_LENGTH = 12;

  /**
   * Derives a 256-bit AES-GCM key from a user's master password and salt.
   */
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a string using AES-GCM. 
   * Returns a base64 string containing [IV + Ciphertext].
   */
  async encrypt(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypts a base64 string [IV + Ciphertext] back to plaintext.
   */
  async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, this.IV_LENGTH);
    const data = combined.slice(this.IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  }
}
```

---

## 3. Widget Data Fetching Logic

Specific implementation for retrieving data from external APIs, handling credential decryption, and mapping the raw JSON response to a normalized PulseGrid payload.

```typescript
/**
 * Core method for fetching and normalizing widget data.
 */
async fetchWidgetData(
    widget: Widget,
    cryptoKey: CryptoKey | null
): Promise<CleanedMetricPayload> {
    // 1. Build Authentication Headers (including decryption of keys if needed)
    const headers = await this.buildAuthHeaders(
        widget.authMethod, 
        widget.authConfig, 
        cryptoKey
    );

    // 2. Perform HTTP Request
    const response = await fetch(widget.endpointUrl, { 
        headers, 
        method: 'GET' 
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const rawData = await response.json();

    // 3. Normalized Data Mapping
    return {
        widgetTitle: widget.title,
        primaryValue: this.getNestedValue(rawData, widget.dataMapping.primaryValuePath),
        unit: widget.displayOptions.unitSuffix,
        series: this.mapSeries(rawData, widget.dataMapping.seriesPath)
    };
}

/**
 * Decrypts credentials and constructs HTTP headers based on auth method.
 */
private async buildAuthHeaders(
    method: string, 
    config: any, 
    key: CryptoKey | null
): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Accept': 'application/json' };

    if (method === 'api-key' && config.encryptedKey && key) {
        const decryptedKey = await this.cryptoService.decrypt(config.encryptedKey, key);
        headers[config.headerName || 'X-API-Key'] = decryptedKey;
    } else if (method === 'bearer' && config.encryptedToken && key) {
        const token = await this.cryptoService.decrypt(config.encryptedToken, key);
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}
```

---

## 4. AI Proxy Integration

Logic for sending normalized widget data to the Groq API (via a secure backend proxy) for automated business analysis.

### Frontend Service (Angular)
```typescript
/**
 * Sends data to the internal proxy for Llama 3.3 analysis.
 */
async analyzeWidgetData(widgetData: CleanedMetricPayload[]): Promise<string> {
    const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            mode: 'insight', 
            widgetData 
        })
    });

    const result = await response.json();
    return result.content; // Markdown response from Groq
}
```

### Backend Proxy (Express/Node.js)
```javascript
/**
 * Secure Proxy for Groq API (Llama 3.3 70B)
 */
app.post('/api/ai/analyze', async (req, res) => {
    const { mode, widgetData } = req.body;

    // Construct AI prompts based on normalized data
    const systemPrompt = `You are PulseGrid AI. Analyze the following BI data and provide insights...`;
    const userPrompt = `Data: ${JSON.stringify(widgetData)}`;

    try {
        const completion = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        const data = await completion.json();
        res.json({ content: data.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ error: 'AI Analysis Failed' });
    }
});
```

---

## 5. Widget Model/Interface

The core TypeScript definition used across the platform to ensure type safety for widget configurations and visualizations.

```typescript
export interface Widget {
  id: string;
  projectId: string;
  title: string;
  endpointUrl: string;
  
  // Authentication Configuration
  authMethod: 'none' | 'api-key' | 'bearer' | 'basic';
  authConfig: {
    encryptedKey?: string;
    headerName?: string;
    encryptedToken?: string;
    encryptedUsername?: string;
    encryptedPassword?: string;
  };

  // Data Connectivity & Extraction
  dataMapping: {
    primaryValuePath: string; // JSONPath to the main metric
    labelPath?: string;
    seriesPath?: string;      // Path for chart data arrays
    aiDescription?: string;   // For AI-driven dynamic extraction
  };

  // UI Representation
  visualization: 'kpi-card' | 'line-chart' | 'bar-chart' | 'donut-chart' | 'gauge';
  displayOptions: {
    unitPrefix?: string;
    unitSuffix?: string;
    decimalPlaces: number;
    colorPalette: string;
  };

  refreshInterval: number | null; // Seconds
}
```

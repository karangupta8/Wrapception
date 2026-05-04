const STORAGE_KEY = 'wrapception_api_key';
const SESSION_KEY = 'wrapception_api_key_session';

// Derives a CryptoKey from a passphrase using PBKDF2
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(text: string, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));

  // Pack: salt(16) + iv(12) + ciphertext
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encoded: string, passphrase: string): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

/**
 * Save an API key.
 * - With passphrase: encrypted in localStorage (survives tab close)
 * - Without passphrase: plaintext in sessionStorage (cleared on tab close)
 */
export async function saveApiKey(apiKey: string, passphrase?: string): Promise<void> {
  if (!apiKey) return;
  if (passphrase) {
    const encrypted = await encrypt(apiKey, passphrase);
    localStorage.setItem(STORAGE_KEY, encrypted);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, apiKey);
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Load a saved API key.
 * - Checks sessionStorage first (no passphrase needed)
 * - Falls back to encrypted localStorage (passphrase required)
 */
export async function loadApiKey(passphrase?: string): Promise<string | null> {
  const sessionKey = sessionStorage.getItem(SESSION_KEY);
  if (sessionKey) return sessionKey;

  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return null;
  if (!passphrase) return null; // Encrypted but no passphrase supplied

  try {
    return await decrypt(encrypted, passphrase);
  } catch {
    return null; // Wrong passphrase or corrupted data
  }
}

export function clearApiKey(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

export function hasStoredApiKey(): boolean {
  return Boolean(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(STORAGE_KEY));
}

export function isApiKeyEncrypted(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

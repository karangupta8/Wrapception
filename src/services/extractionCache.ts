/**
 * Extraction cache service using IndexedDB.
 * Caches per-source extractions by content hash + template + provider.
 * Prevents re-extracting identical sources and enables result reuse.
 */

import type { SourceExtraction } from './aiService';

const DB_NAME = 'wrapception-extraction-cache';
const STORE_NAME = 'extractions';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  key: string;
  contentHash: string;
  templateId: string;
  aiProvider: string;
  extraction: SourceExtraction;
  timestamp: number;
}

let db: IDBDatabase | null = null;

async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('provider', 'aiProvider', { unique: false });
      }
    };
  });
}

/** Compute SHA-256 hash of content. */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Retrieve cached extraction if available. */
export async function getCachedExtraction(
  contentHash: string,
  templateId: string,
  provider: string,
): Promise<SourceExtraction | null> {
  const database = await initDB();
  const key = `${contentHash}:${templateId}:${provider}`;

  return new Promise((resolve) => {
    const tx = database.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const entry = request.result as CacheEntry | undefined;
      if (entry) {
        // Check TTL
        if (Date.now() - entry.timestamp > TTL_MS) {
          // Expired, delete and return null
          deleteCacheEntry(key).catch(() => {});
          resolve(null);
        } else {
          resolve(entry.extraction);
        }
      } else {
        resolve(null);
      }
    };
  });
}

/** Store extraction result in cache. */
export async function cacheExtraction(
  contentHash: string,
  templateId: string,
  provider: string,
  extraction: SourceExtraction,
): Promise<void> {
  const database = await initDB();
  const key = `${contentHash}:${templateId}:${provider}`;

  const entry: CacheEntry = {
    key,
    contentHash,
    templateId,
    aiProvider: provider,
    extraction,
    timestamp: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/** Delete single cache entry. */
async function deleteCacheEntry(key: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/** Clear all cache entries older than TTL. */
export async function clearExpiredCache(): Promise<void> {
  const database = await initDB();
  const cutoff = Date.now() - TTL_MS;

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    const request = index.openCursor(range);

    request.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/** Clear all cache entries. */
export async function clearAllCache(): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

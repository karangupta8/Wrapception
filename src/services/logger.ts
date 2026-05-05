/**
 * Lightweight logging service that stores logs in IndexedDB
 * Logs are kept as a ring buffer (last 500 entries, 7-day TTL)
 * Exported as JSON for debugging support
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
}

export interface LogStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  oldestLog: number;
  newestLog: number;
}

const DB_NAME = 'wrapception';
const STORE_NAME = 'logs';
const MAX_LOGS = 500;
const LOG_TTL_DAYS = 7;

class Logger {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('level', 'level', { unique: false });
        }
      };
    });
  }

  async log(
    level: LogLevel,
    category: string,
    message: string,
    context?: Record<string, unknown>,
    stack?: string
  ): Promise<void> {
    await this.initPromise;

    if (!this.db) return;

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      context,
      stack,
    };

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleLevel = level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log';
      console[consoleLevel as 'log' | 'warn' | 'error'](`[${category}] ${message}`, context, stack);
    }

    return new Promise((resolve) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // Add new entry
      store.add(entry);

      // Count total logs
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const total = countRequest.result;

        // If over limit, delete oldest entries
        if (total > MAX_LOGS) {
          const indexRequest = store.index('timestamp').openCursor();
          let deleted = 0;
          const toDelete = total - MAX_LOGS;

          indexRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor && deleted < toDelete) {
              cursor.delete();
              deleted++;
              cursor.continue();
            }
          };
        }
      };

      tx.oncomplete = () => resolve();
    });
  }

  debug(category: string, message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log('debug', category, message, context);
  }

  info(category: string, message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log('info', category, message, context);
  }

  warn(category: string, message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log('warn', category, message, context);
  }

  error(category: string, message: string, error?: unknown, context?: Record<string, unknown>): Promise<void> {
    const stack = error instanceof Error ? error.stack : undefined;
    return this.log('error', category, message, context, stack);
  }

  async getAllLogs(): Promise<LogEntry[]> {
    await this.initPromise;

    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const logs = request.result as LogEntry[];
        // Sort by timestamp descending (newest first)
        resolve(logs.sort((a, b) => b.timestamp - a.timestamp));
      };
    });
  }

  async getStats(): Promise<LogStats> {
    const logs = await this.getAllLogs();

    const errorCount = logs.filter((l) => l.level === 'error').length;
    const warningCount = logs.filter((l) => l.level === 'warn').length;

    return {
      totalLogs: logs.length,
      errorCount,
      warningCount,
      oldestLog: logs.length > 0 ? logs[logs.length - 1].timestamp : 0,
      newestLog: logs.length > 0 ? logs[0].timestamp : 0,
    };
  }

  async exportLogs(): Promise<string> {
    const logs = await this.getAllLogs();
    const stats = await this.getStats();

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        stats,
        logs,
      },
      null,
      2
    );
  }

  async clearLogs(): Promise<void> {
    await this.initPromise;

    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
    });
  }

  async clearOldLogs(): Promise<void> {
    const cutoff = Date.now() - LOG_TTL_DAYS * 24 * 60 * 60 * 1000;
    const logs = await this.getAllLogs();

    await this.initPromise;

    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      logs.forEach((log) => {
        if (log.timestamp < cutoff) {
          store.delete(log.id);
        }
      });

      tx.oncomplete = () => resolve();
    });
  }
}

export const logger = new Logger();

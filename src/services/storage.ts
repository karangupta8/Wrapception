import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'wrapception';
const DB_VERSION = 1;

interface WrapceptionDBSchema {
  sourceContent: {
    key: string;
    value: { id: string; content: string; updatedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<WrapceptionDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<WrapceptionDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<WrapceptionDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sourceContent')) {
          db.createObjectStore('sourceContent', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSourceContent(id: string, content: string): Promise<void> {
  const db = await getDB();
  await db.put('sourceContent', { id, content, updatedAt: Date.now() });
}

export async function getSourceContent(id: string): Promise<string | null> {
  const db = await getDB();
  const record = await db.get('sourceContent', id);
  return record?.content ?? null;
}

export async function deleteSourceContent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sourceContent', id);
}

export async function loadAllSourceContent(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const db = await getDB();
  const entries = await Promise.all(
    ids.map(async (id) => {
      const record = await db.get('sourceContent', id);
      return [id, record?.content ?? null] as [string, string | null];
    })
  );
  return Object.fromEntries(entries.filter(([, content]) => content !== null)) as Record<string, string>;
}

export async function clearAllSourceContent(): Promise<void> {
  const db = await getDB();
  await db.clear('sourceContent');
}

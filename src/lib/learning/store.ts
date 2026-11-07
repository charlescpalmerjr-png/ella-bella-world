// PASS 06 — local progress storage (IndexedDB), per Master Research spec System 1 §5.
// MDN: Using IndexedDB; Storage quotas and eviction criteria; StorageManager.persist().
// Holds no names, emails, recordings or other personal data: just word IDs and counts.
// Falls back to memory if IndexedDB is unavailable (e.g. some private-browsing modes).

import type { WordProgress } from "./scheduler";

const DB_NAME = "ella-bella-learning";
const DB_VERSION = 1;
const STORE = "wordProgress";

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, WordProgress>(); // fallback store
const memKey = (p: { profileId: string; wordId: string }) => `${p.profileId}|${p.wordId}`;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: ["profileId", "wordId"] });
          store.createIndex("byProfile", "profileId");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** Ask the browser to keep this data (approval is browser-dependent; failure is fine). */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // ignore
  }
}

export async function loadProgress(profileId: string): Promise<Map<string, WordProgress>> {
  const out = new Map<string, WordProgress>();
  const db = await openDb();
  if (!db) {
    for (const p of memory.values()) if (p.profileId === profileId) out.set(p.wordId, p);
    return out;
  }
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).index("byProfile").getAll(profileId);
      req.onsuccess = () => {
        for (const p of req.result as WordProgress[]) out.set(p.wordId, p);
        resolve(out);
      };
      req.onerror = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

export async function saveProgress(p: WordProgress): Promise<void> {
  memory.set(memKey(p), p);
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(p);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // quota or other error: keep playing, memory copy remains
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function resetProgress(profileId: string): Promise<void> {
  for (const [k, p] of memory) if (p.profileId === profileId) memory.delete(k);
  const db = await openDb();
  if (!db) return;
  const existing = await loadProgress(profileId);
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const p of existing.values()) store.delete([p.profileId, p.wordId]);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

import type { CV } from "./types";
import { sanitizeCV } from "./cv";

/**
 * All CV data lives in this browser's localStorage. Nothing is sent to a server.
 * Layout: one index key with the list of ids, one key per CV. Keeping CVs in
 * separate keys means a single corrupt record cannot wipe out the others.
 */
export const INDEX_KEY = "cvweb:v1:index";
export const CV_KEY_PREFIX = "cvweb:v1:cv:";

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly kind: "unavailable" | "quota" | "unknown",
  ) {
    super(message);
    this.name = "StorageError";
  }
}

function getStore(): Storage {
  try {
    const s = window.localStorage;
    const probe = "cvweb:probe";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    throw new StorageError(
      "Your browser is blocking local storage (private mode or site data disabled), so CVs cannot be saved.",
      "unavailable",
    );
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22 || e.code === 1014)
  );
}

function write(store: Storage, key: string, value: string) {
  try {
    store.setItem(key, value);
  } catch (e) {
    if (isQuotaError(e)) {
      throw new StorageError("Browser storage is full. Delete or export some CVs, then try again.", "quota");
    }
    throw new StorageError("Could not save to browser storage.", "unknown");
  }
}

function readIndex(store: Storage): string[] {
  try {
    const raw = store.getItem(INDEX_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(store: Storage, ids: string[]) {
  write(store, INDEX_KEY, JSON.stringify(Array.from(new Set(ids))));
}

export function isStorageAvailable(): boolean {
  try {
    getStore();
    return true;
  } catch {
    return false;
  }
}

export function loadCV(id: string): CV | null {
  const store = getStore();
  const raw = store.getItem(CV_KEY_PREFIX + id);
  if (!raw) return null;
  try {
    const cv = sanitizeCV(JSON.parse(raw));
    // The key is authoritative: never let a record claim another document's id.
    if (cv) cv.id = id;
    return cv;
  } catch {
    return null;
  }
}

export interface ListResult {
  cvs: CV[];
  /** Ids whose stored data could not be parsed. They are left untouched, never silently deleted. */
  corrupt: string[];
}

export function listCVs(): ListResult {
  const store = getStore();
  const ids = readIndex(store);
  // Recover CVs whose key exists but which are missing from the index (e.g. index write failed).
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith(CV_KEY_PREFIX)) {
      const id = key.slice(CV_KEY_PREFIX.length);
      if (!ids.includes(id)) ids.push(id);
    }
  }
  const cvs: CV[] = [];
  const corrupt: string[] = [];
  for (const id of ids) {
    if (store.getItem(CV_KEY_PREFIX + id) === null) continue;
    const cv = loadCV(id);
    if (cv) cvs.push(cv);
    else corrupt.push(id);
  }
  cvs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { cvs, corrupt };
}

/** Saves the CV and returns the stored copy (with a fresh updatedAt unless `touch` is false). */
export function saveCV(cv: CV, { touch = true }: { touch?: boolean } = {}): CV {
  const store = getStore();
  const toSave: CV = touch ? { ...cv, updatedAt: new Date().toISOString() } : cv;
  write(store, CV_KEY_PREFIX + toSave.id, JSON.stringify(toSave));
  const ids = readIndex(store);
  if (!ids.includes(toSave.id)) writeIndex(store, [...ids, toSave.id]);
  return toSave;
}

/**
 * Removes every CV this app saved (including damaged ones) and its index.
 * Only keys with this app's prefix are touched; other data on the site is left alone.
 * Returns how many CVs were removed.
 */
export function clearAllCVs(): number {
  const store = getStore();
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith("cvweb:")) keys.push(key);
  }
  for (const key of keys) store.removeItem(key);
  return keys.filter((k) => k.startsWith(CV_KEY_PREFIX)).length;
}

export function deleteCV(id: string): void {
  const store = getStore();
  store.removeItem(CV_KEY_PREFIX + id);
  writeIndex(
    store,
    readIndex(store).filter((x) => x !== id),
  );
}

export function storageBytesUsed(): number {
  try {
    const store = getStore();
    let total = 0;
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith("cvweb:")) total += (key.length + (store.getItem(key)?.length ?? 0)) * 2;
    }
    return total;
  } catch {
    return 0;
  }
}

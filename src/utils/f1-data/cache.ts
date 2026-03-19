import { DB_FILE_KEY, DB_NAME, DB_VERSION, STORE_NAME } from './constants';

const DB_META_STORAGE_KEY = 'f1express-db-meta';

export type CachedDbMeta = {
  sizeBytes: number;
  modifiedAt: string;
  appVersion?: string;
  etag?: string;
};

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        indexedDB.deleteDatabase(DB_NAME);
        reject(new Error('Object store not found, deleting database for reset'));
      } else {
        resolve(db);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const getCachedDb = async (): Promise<Uint8Array | null> => {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DB_FILE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const saveDbToCache = async (data: Uint8Array) => {
  try {
    const db = await openDb();
    return new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(data, DB_FILE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to save DB to cache:', error);
  }
};

export const resetCachedDb = () => {
  indexedDB.deleteDatabase(DB_NAME);
};

export const getCachedDbMeta = (): CachedDbMeta | null => {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(DB_META_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CachedDbMeta;
  } catch {
    return null;
  }
};

export const saveDbMeta = (meta: CachedDbMeta) => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(DB_META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // Ignore localStorage failures
  }
};

export const resetCachedDbMeta = () => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(DB_META_STORAGE_KEY);
  } catch {
    // Ignore localStorage failures
  }
};

export function shouldRefreshCachedDb(
  cachedMeta: CachedDbMeta | null,
  remoteMeta: CachedDbMeta | null
) {
  if (!cachedMeta || !remoteMeta) {
    return false;
  }

  return (
    cachedMeta.sizeBytes !== remoteMeta.sizeBytes ||
    cachedMeta.modifiedAt !== remoteMeta.modifiedAt ||
    cachedMeta.appVersion !== remoteMeta.appVersion ||
    cachedMeta.etag !== remoteMeta.etag
  );
}

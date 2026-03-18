import { DB_FILE_KEY, DB_NAME, DB_VERSION, STORE_NAME } from './constants';

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

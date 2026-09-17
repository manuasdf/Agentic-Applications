// IndexedDB Service for AutoCV
// Provides a localStorage-like API but with IndexedDB for larger storage capacity

// Database configuration
const DB_NAME = 'AutoCVDB';
const DB_VERSION = 1;

// Store names
const STORE_SETTINGS = 'settings';
const STORE_PROFILES = 'profiles';
const STORE_JOBS = 'jobs';
const STORE_GENERATIONS = 'generations';
const STORE_DOCUMENTS = 'documents';

// Type for our storage keys (compatible with existing STORAGE_KEYS)
export type StorageKey = 'autocv_settings' | 'autocv_profiles' | 'autocv_jobs' | 'autocv_generations' | 'autocv_documents';

// Map storage keys to IndexedDB stores
const KEY_TO_STORE: Record<StorageKey, string> = {
  'autocv_settings': STORE_SETTINGS,
  'autocv_profiles': STORE_PROFILES,
  'autocv_jobs': STORE_JOBS,
  'autocv_generations': STORE_GENERATIONS,
  'autocv_documents': STORE_DOCUMENTS,
};

// Singleton database instance
let db: IDBDatabase | null = null;

// Promise to track database initialization
let dbPromise: Promise<IDBDatabase> | null = null;

// Initialize the database
function initDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_JOBS)) {
        db.createObjectStore(STORE_JOBS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_GENERATIONS)) {
        db.createObjectStore(STORE_GENERATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

// Get the database instance
async function getDB(): Promise<IDBDatabase> {
  if (db) {
    return db;
  }
  return initDB();
}

// Save data to IndexedDB
export async function saveToIndexedDB<T>(key: StorageKey, data: T): Promise<void> {
  const store = KEY_TO_STORE[key];
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    
    // For settings (single object), use a fixed key
    if (store === STORE_SETTINGS) {
      const request = objectStore.put(data, 'settings');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } else {
      // For arrays (profiles, jobs, generations), store the entire array
      const request = objectStore.put({ id: 'all', data }, 'all');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }
  });
}

// Load data from IndexedDB
export async function loadFromIndexedDB<T>(key: StorageKey, defaultValue: T): Promise<T> {
  const store = KEY_TO_STORE[key];
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readonly');
    const objectStore = transaction.objectStore(store);
    
    if (store === STORE_SETTINGS) {
      const request = objectStore.get('settings');
      request.onsuccess = () => {
        resolve(request.result !== undefined ? request.result : defaultValue);
      };
      request.onerror = () => reject(request.error);
    } else {
      const request = objectStore.get('all');
      request.onsuccess = () => {
        resolve(request.result?.data !== undefined ? request.result.data : defaultValue);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

// Delete data from IndexedDB
export async function deleteFromIndexedDB(key: StorageKey): Promise<void> {
  const store = KEY_TO_STORE[key];
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    
    if (store === STORE_SETTINGS) {
      const request = objectStore.delete('settings');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } else {
      const request = objectStore.delete('all');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }
  });
}

// Clear all data from IndexedDB
export async function clearIndexedDB(): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const stores = [STORE_SETTINGS, STORE_PROFILES, STORE_JOBS, STORE_GENERATIONS, STORE_DOCUMENTS];
    let completed = 0;
    const errors: unknown[] = [];
    
    stores.forEach(store => {
      const transaction = db.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      
      const request = objectStore.clear();
      request.onsuccess = () => {
        completed++;
        if (completed === stores.length) {
          if (errors.length > 0) {
            reject(errors[0]);
          } else {
            resolve();
          }
        }
      };
      request.onerror = () => {
        errors.push(request.error);
        completed++;
        if (completed === stores.length) {
          reject(errors[0]);
        }
      };
    });
  });
}

// Migrate data from localStorage to IndexedDB
export async function migrateFromLocalStorage(): Promise<void> {
  const localStorageKeys: StorageKey[] = [
    'autocv_settings',
    'autocv_profiles',
    'autocv_jobs',
    'autocv_generations',
  ];
  
  for (const key of localStorageKeys) {
    const localData = localStorage.getItem(key);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        await saveToIndexedDB(key, parsed);
      } catch (e) {
        console.error(`Failed to migrate ${key} from localStorage:`, e);
      }
    }
  }
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

// Initialize storage - opens DB and migrates from localStorage
export async function initializeStorage(): Promise<void> {
  try {
    await initDB();
    if (isIndexedDBAvailable()) {
      await migrateFromLocalStorage();
    }
  } catch (e) {
    console.error('Failed to initialize IndexedDB:', e);
    throw e;
  }
}

// Document-specific functions
export interface StoredDocument {
  id: string;
  jobId: string;
  documentType: 'cv' | 'cover_letter' | 'email';
  latex?: string;
  content?: string;
  pdfBase64?: string;
  createdAt: string;
}

// Save a document
export async function saveDocument(document: StoredDocument): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const objectStore = transaction.objectStore(STORE_DOCUMENTS);
    
    const request = objectStore.put(document);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Load all documents for a specific job
export async function loadDocumentsByJob(jobId: string): Promise<StoredDocument[]> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DOCUMENTS, 'readonly');
    const objectStore = transaction.objectStore(STORE_DOCUMENTS);
    
    const request = objectStore.getAll();
    request.onsuccess = () => {
      const allDocs = request.result as StoredDocument[];
      const jobDocs = allDocs.filter(doc => doc.jobId === jobId);
      resolve(jobDocs);
    };
    request.onerror = () => reject(request.error);
  });
}

// Load a specific document
export async function loadDocument(id: string): Promise<StoredDocument | null> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DOCUMENTS, 'readonly');
    const objectStore = transaction.objectStore(STORE_DOCUMENTS);
    
    const request = objectStore.get(id);
    request.onsuccess = () => {
      resolve(request.result as StoredDocument | null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Delete a document
export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const objectStore = transaction.objectStore(STORE_DOCUMENTS);
    
    const request = objectStore.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Delete all documents for a specific job
export async function deleteDocumentsByJob(jobId: string): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const objectStore = transaction.objectStore(STORE_DOCUMENTS);
    
    // Get all documents first
    const getRequest = objectStore.getAll();
    getRequest.onsuccess = () => {
      const allDocs = getRequest.result as StoredDocument[];
      const jobDocs = allDocs.filter(doc => doc.jobId === jobId);
      
      if (jobDocs.length === 0) {
        resolve();
        return;
      }
      
      let completed = 0;
      const errors: unknown[] = [];
      
      jobDocs.forEach(doc => {
        const deleteRequest = objectStore.delete(doc.id);
        deleteRequest.onsuccess = () => {
          completed++;
          if (completed === jobDocs.length) {
            if (errors.length > 0) {
              reject(errors[0]);
            } else {
              resolve();
            }
          }
        };
        deleteRequest.onerror = () => {
          errors.push(deleteRequest.error);
          completed++;
          if (completed === jobDocs.length) {
            reject(errors[0]);
          }
        };
      });
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

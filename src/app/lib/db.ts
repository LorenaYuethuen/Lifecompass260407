import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncItem {
  id: string;
  entity: string;
  op: 'create' | 'update' | 'patch' | 'delete';
  payload: any;
  priority: number; // 0: P0, 1: P1, 2: P2
  desc: string;
  conflict: 'last-write-wins' | 'max' | 'array-union' | 'append';
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  timestamp: number;
}

interface LifeCompassDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncItem;
    indexes: {
      'by-status': string;
      'by-priority': number;
      'by-timestamp': number;
    };
  };
  localCache: {
    key: string;
    value: {
      key: string;
      data: any;
      updatedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<LifeCompassDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<LifeCompassDB>('life-compass-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-priority', 'priority');
          syncStore.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('localCache')) {
          db.createObjectStore('localCache', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

// Queue operations
export const addToQueue = async (item: Omit<SyncItem, 'id' | 'timestamp' | 'status'>) => {
  const db = await initDB();
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  const fullItem: SyncItem = {
    ...item,
    id,
    timestamp,
    status: 'pending',
  };
  await db.put('syncQueue', fullItem);
  return fullItem;
};

export const getPendingQueue = async () => {
  const db = await initDB();
  return await db.getAllFromIndex('syncQueue', 'by-status', 'pending');
};

export const updateQueueItemStatus = async (id: string, status: SyncItem['status']) => {
  const db = await initDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.status = status;
    await db.put('syncQueue', item);
  }
};

export const clearSyncedQueue = async () => {
  const db = await initDB();
  const synced = await db.getAllFromIndex('syncQueue', 'by-status', 'synced');
  const tx = db.transaction('syncQueue', 'readwrite');
  await Promise.all(synced.map((item) => tx.store.delete(item.id)));
  await tx.done;
};

// Local cache operations for offline degradation
export const setLocalCache = async (key: string, data: any) => {
  const db = await initDB();
  await db.put('localCache', { key, data, updatedAt: Date.now() });
};

export const getLocalCache = async (key: string) => {
  const db = await initDB();
  const item = await db.get('localCache', key);
  return item?.data || null;
};

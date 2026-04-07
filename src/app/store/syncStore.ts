import { create } from 'zustand';
import { addToQueue, getPendingQueue, updateQueueItemStatus, clearSyncedQueue } from '../lib/db';
import { useSysStore } from './sysStore';

export interface QueuedOperation {
  id: string;
  entity: string;
  op: 'create' | 'update' | 'patch' | 'delete';
  priority: number;
  desc: string;
  conflict: 'last-write-wins' | 'max' | 'array-union' | 'append';
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  timestamp: number;
}

interface SyncStore {
  queue: QueuedOperation[];
  initialized: boolean;
  loadQueue: () => Promise<void>;
  enqueue: (item: Omit<QueuedOperation, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  flush: () => Promise<void>;
  resetDemoQueue: () => Promise<void>; // Just for prototyping
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  queue: [],
  initialized: false,

  loadQueue: async () => {
    try {
      const pendingItems = await getPendingQueue();
      set({ queue: pendingItems, initialized: true });
    } catch (e) {
      console.error("Failed to load sync queue from IDB:", e);
    }
  },

  enqueue: async (item) => {
    try {
      const added = await addToQueue(item);
      set((state) => ({ queue: [...state.queue, added] }));
      useSysStore.getState().emitEvent('SyncQueue', 'enqueue', { opId: added.id, entity: item.entity });
    } catch (e) {
      console.error("Failed to enqueue item:", e);
    }
  },

  flush: async () => {
    const sys = useSysStore.getState();
    if (sys.isOffline) return;
    if (get().queue.length === 0) return;

    sys.setSyncing(true);
    sys.emitEvent('SyncManager', 'flush_start', { queueSize: get().queue.length });

    // Mark as syncing in memory
    set((state) => ({
      queue: state.queue.map(q => q.status === 'pending' ? { ...q, status: 'syncing' } : q)
    }));

    // Simulate network delay based on queue size
    const delay = Math.max(1000, Math.min(get().queue.length * 400, 3000));
    
    setTimeout(async () => {
      // Simulate sync success
      const currentQueue = get().queue;
      const syncingItems = currentQueue.filter(q => q.status === 'syncing');
      
      for (const item of syncingItems) {
        await updateQueueItemStatus(item.id, 'synced');
      }

      set((state) => ({
        queue: state.queue.map(q => q.status === 'syncing' ? { ...q, status: 'synced' } : q)
      }));

      sys.emitEvent('SyncManager', 'flush_complete', { syncedCount: syncingItems.length });
      sys.setSyncing(false);

      // Clean up after 2 seconds
      setTimeout(async () => {
        await clearSyncedQueue();
        await get().loadQueue();
      }, 2000);
    }, delay);
  },

  resetDemoQueue: async () => {
    const defaultData: Omit<QueuedOperation, 'id' | 'timestamp' | 'status'>[] = [
      { entity: "DB-01", op: "patch", priority: 0, desc: "LIFEMATRICES 打卡", conflict: "last-write-wins" },
      { entity: "DB-03", op: "patch", priority: 0, desc: "任务状态变更", conflict: "last-write-wins" },
      { entity: "DB-04", op: "patch", priority: 1, desc: "OKR 进度更新", conflict: "max" },
      { entity: "DB-06", op: "create", priority: 1, desc: "知识录入草稿", conflict: "array-union" },
      { entity: "DB-08", op: "create", priority: 2, desc: "HSI 历史日志", conflict: "append" },
    ];
    
    // Check if IDB has elements, if yes don't reset
    const pendingItems = await getPendingQueue();
    if (pendingItems.length === 0) {
      for (const item of defaultData) {
        await get().enqueue(item);
      }
    }
  }
}));

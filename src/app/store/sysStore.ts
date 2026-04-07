import { create } from 'zustand';

interface EventPayload {
  source: string;
  type: string;
  data: any;
  timestamp: number;
}

interface SysStore {
  isOffline: boolean;
  isSyncing: boolean;
  events: EventPayload[];
  setOffline: (offline: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  emitEvent: (source: string, type: string, data: any) => void;
  clearEvents: () => void;
}

export const useSysStore = create<SysStore>((set, get) => ({
  isOffline: true,
  isSyncing: false,
  events: [],
  setOffline: (offline: boolean) => set({ isOffline: offline }),
  setSyncing: (syncing: boolean) => set({ isSyncing: syncing }),
  emitEvent: (source, type, data) => {
    const newEvent = {
      source,
      type,
      data,
      timestamp: Date.now(),
    };
    
    // Add event, keep max 50 for memory
    set((state) => ({
      events: [newEvent, ...state.events].slice(0, 50),
    }));
  },
  clearEvents: () => set({ events: [] }),
}));

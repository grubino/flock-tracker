import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { syncService } from '../services/syncService';
import type { SyncStatus } from '../services/syncService';
import { offlineQueue } from '../services/offlineQueue';

interface OfflineContextType {
  isOnline: boolean;
  queueSize: number;
  syncStatus: SyncStatus;
  triggerSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [queueSize, setQueueSize] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    progress: 0,
    total: 0,
  });

  // Update queue size periodically
  useEffect(() => {
    const updateQueueSize = async () => {
      const size = await offlineQueue.getQueueSize();
      setQueueSize(size);
    };

    updateQueueSize();
    const interval = setInterval(updateQueueSize, 2000);

    return () => clearInterval(interval);
  }, []);

  // Listen to sync status changes
  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  // Automatically sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      console.log('[OfflineContext] Connection restored, triggering sync');
      triggerSync();
    }
  }, [wasOffline, isOnline]);

  const triggerSync = async () => {
    if (!isOnline) {
      console.log('[OfflineContext] Cannot sync while offline');
      return;
    }

    if (syncStatus.isSyncing) {
      console.log('[OfflineContext] Sync already in progress');
      return;
    }

    console.log('[OfflineContext] Starting manual sync');
    await syncService.syncQueue();
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        queueSize,
        syncStatus,
        triggerSync,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}

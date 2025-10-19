import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { offlineQueue } from './offlineQueue';
import type { QueuedRequest } from './offlineQueue';

const MAX_RETRIES = 3;

class SyncService {
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];

  async syncQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress');
      return { success: 0, failed: 0, total: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners({ isSyncing: true, progress: 0, total: 0 });

    try {
      const requests = await offlineQueue.getRequestsByTimestamp();
      const total = requests.length;

      if (total === 0) {
        console.log('[SyncService] No requests to sync');
        this.notifyListeners({ isSyncing: false, progress: 0, total: 0 });
        this.isSyncing = false;
        return { success: 0, failed: 0, total: 0 };
      }

      console.log(`[SyncService] Starting sync of ${total} requests`);
      let success = 0;
      let failed = 0;

      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        this.notifyListeners({
          isSyncing: true,
          progress: i + 1,
          total,
          currentRequest: request,
        });

        try {
          await this.executeRequest(request);
          await offlineQueue.removeRequest(request.id);
          success++;
          console.log(`[SyncService] Request ${i + 1}/${total} synced successfully`);
        } catch (error) {
          console.error(`[SyncService] Request ${i + 1}/${total} failed:`, error);

          // Increment retry count
          await offlineQueue.incrementRetryCount(request.id);

          // Remove if max retries reached
          if (request.retryCount >= MAX_RETRIES - 1) {
            console.error('[SyncService] Max retries reached, removing request:', request.id);
            await offlineQueue.updateRequest(request.id, {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Optionally remove or keep for manual review
            await offlineQueue.removeRequest(request.id);
          }

          failed++;
        }
      }

      console.log(`[SyncService] Sync complete: ${success} success, ${failed} failed`);
      this.notifyListeners({ isSyncing: false, progress: total, total });

      return { success, failed, total };
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeRequest(request: QueuedRequest): Promise<void> {
    const config: AxiosRequestConfig = {
      method: request.method as any,
      url: request.url,
      data: request.data,
      headers: {
        ...request.headers,
        'X-Offline-Sync': 'true', // Mark as a synced request
      },
    };

    const response = await axios(config);
    return response.data;
  }

  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach(listener => listener(status));
  }
}

export interface SyncStatus {
  isSyncing: boolean;
  progress: number;
  total: number;
  currentRequest?: QueuedRequest;
}

export interface SyncResult {
  success: number;
  failed: number;
  total: number;
}

export const syncService = new SyncService();

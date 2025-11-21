import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface OfflineQueueDB extends DBSchema {
  requests: {
    key: string;
    value: QueuedRequest;
    indexes: { 'by-timestamp': number };
  };
}

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  error?: string;
}

class OfflineQueueService {
  private db: IDBPDatabase<OfflineQueueDB> | null = null;
  private dbName = 'flock-tracker-offline-queue';
  private readonly storeName = 'requests' as const;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineQueueDB>(this.dbName, 1, {
      upgrade(db) {
        // Create object store for queued requests
        const store = db.createObjectStore('requests', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }

  async addRequest(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    await this.init();

    const queuedRequest: QueuedRequest = {
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    await this.db!.add(this.storeName, queuedRequest);
    console.log('[OfflineQueue] Request queued:', queuedRequest.method, queuedRequest.url);

    return queuedRequest.id;
  }

  async getAllRequests(): Promise<QueuedRequest[]> {
    await this.init();
    return this.db!.getAll(this.storeName);
  }

  async getRequestsByTimestamp(): Promise<QueuedRequest[]> {
    await this.init();
    return this.db!.getAllFromIndex(this.storeName, 'by-timestamp');
  }

  async removeRequest(id: string): Promise<void> {
    await this.init();
    await this.db!.delete(this.storeName, id);
    console.log('[OfflineQueue] Request removed:', id);
  }

  async updateRequest(id: string, updates: Partial<QueuedRequest>): Promise<void> {
    await this.init();
    const request = await this.db!.get(this.storeName, id);
    if (request) {
      await this.db!.put(this.storeName, { ...request, ...updates });
    }
  }

  async incrementRetryCount(id: string): Promise<void> {
    await this.init();
    const request = await this.db!.get(this.storeName, id);
    if (request) {
      await this.db!.put(this.storeName, {
        ...request,
        retryCount: request.retryCount + 1,
      });
    }
  }

  async clear(): Promise<void> {
    await this.init();
    await this.db!.clear(this.storeName);
    console.log('[OfflineQueue] Queue cleared');
  }

  async getQueueSize(): Promise<number> {
    await this.init();
    const requests = await this.db!.getAll(this.storeName);
    return requests.length;
  }
}

export const offlineQueue = new OfflineQueueService();

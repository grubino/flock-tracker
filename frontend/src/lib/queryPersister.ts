import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { capacitorStorage } from './capacitorStorage';

/**
 * Cache duration: 7 days in milliseconds
 */
export const CACHE_TIME = 7 * 24 * 60 * 60 * 1000; // 604,800,000ms (7 days)

/**
 * Garbage collection time: 8 days (cache time + 1 day buffer)
 * This ensures we keep the cache slightly longer than the stale time
 * to handle edge cases
 */
export const GC_TIME = CACHE_TIME + (24 * 60 * 60 * 1000);

/**
 * Create a new QueryClient with caching configuration
 */
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // How long data stays fresh before being marked as stale
        staleTime: CACHE_TIME,

        // How long unused/inactive cache is kept in memory before garbage collection
        gcTime: GC_TIME,

        // Retry failed requests once
        retry: 1,

        // Don't refetch on window focus (we'll rely on staleTime instead)
        refetchOnWindowFocus: false,

        // Auto-refresh stale data when the app comes back online
        refetchOnReconnect: true,

        // Persist queries that succeed
        // Note: Queries with errors are not persisted
        networkMode: 'offlineFirst',
      },
      mutations: {
        // Mutations will fail immediately when offline
        networkMode: 'online',

        // Don't retry mutations by default
        retry: 0,
      },
    },
  });
};

/**
 * Persister configuration
 * - Uses Capacitor Preferences for storage (works on web and mobile)
 * - Max age: 7 days
 */
export const persisterOptions = {
  persister: capacitorStorage,
  maxAge: CACHE_TIME,

  // Dehydrate options - what to save to storage
  dehydrateOptions: {
    // Don't persist mutations, only queries
    shouldDehydrateMutation: () => false,

    // Persist all successful queries
    shouldDehydrateQuery: () => true,
  },
};

// Export types for TypeScript
export type { PersistQueryClientProvider };

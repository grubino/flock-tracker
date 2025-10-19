import { Preferences } from '@capacitor/preferences';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

/**
 * Capacitor Preferences storage adapter for React Query persist
 * Works on both web (localStorage) and mobile (native storage)
 */
export const capacitorStorage: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      await Preferences.set({
        key: 'REACT_QUERY_OFFLINE_CACHE',
        value: JSON.stringify(client),
      });
    } catch (error) {
      console.error('Error persisting cache to Capacitor Preferences:', error);
    }
  },

  restoreClient: async () => {
    try {
      const { value } = await Preferences.get({ key: 'REACT_QUERY_OFFLINE_CACHE' });
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      console.error('Error restoring cache from Capacitor Preferences:', error);
      return undefined;
    }
  },

  removeClient: async () => {
    try {
      await Preferences.remove({ key: 'REACT_QUERY_OFFLINE_CACHE' });
    } catch (error) {
      console.error('Error removing cache from Capacitor Preferences:', error);
    }
  },
};

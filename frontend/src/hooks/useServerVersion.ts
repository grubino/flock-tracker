import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const SERVER_START_TIME_KEY = 'server_start_time';

export const useServerVersion = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkServerVersion = async () => {
      try {
        const response = await api.get<{ server_start_time: string }>('/api');
        const newStartTime = response.data.server_start_time;
        const storedStartTime = localStorage.getItem(SERVER_START_TIME_KEY);

        // If server start time has changed, clear the cache
        if (storedStartTime && storedStartTime !== newStartTime) {
          console.log('[Cache] Server restarted, clearing React Query cache');
          await queryClient.invalidateQueries();
          queryClient.clear();
        }

        // Store the new start time
        localStorage.setItem(SERVER_START_TIME_KEY, newStartTime);
      } catch (error) {
        console.error('[Cache] Failed to check server version:', error);
      }
    };

    checkServerVersion();
  }, [queryClient]);
};

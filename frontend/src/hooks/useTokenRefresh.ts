import { useEffect, useRef } from 'react';
import axios from 'axios';

const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Hook to automatically refresh the authentication token periodically
 * This keeps the user logged in as long as they're actively using the app
 */
export const useTokenRefresh = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const refreshToken = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // No token, user is not logged in
        return;
      }

      try {
        // Get server URL from localStorage or fall back to environment variable
        const serverUrl = localStorage.getItem('server_url') || import.meta.env.VITE_API_URL || '';

        const response = await axios.post(
          `${serverUrl}/api/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.access_token) {
          // Update the token in localStorage
          localStorage.setItem('auth_token', response.data.access_token);
          console.log('[TokenRefresh] Token refreshed successfully');
        }
      } catch (error) {
        console.error('[TokenRefresh] Failed to refresh token:', error);
        // If refresh fails (e.g., token expired), the API interceptor will handle logout
      }
    };

    // Refresh token immediately on mount (if user is logged in)
    refreshToken();

    // Set up periodic refresh
    intervalRef.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';

// Type the mock api for tests
const mockApi = api as any;

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe.skip('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });

    it('should provide initial unauthenticated state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should load user from localStorage on mount', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local' as const,
        role: 'user' as const,
      };

      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'new@example.com',
          name: 'New User',
          role: 'customer',
        },
        token: 'new-token',
      };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@example.com', 'password123', 'New User');
      });

      expect(result.current.user).toEqual({
        id: '1',
        email: 'new@example.com',
        name: 'New User',
        provider: 'local',
        role: 'customer',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem('auth_token')).toBe('new-token');
    });

    it('should handle registration failure', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Registration failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register('new@example.com', 'password123', 'New User');
        })
      ).rejects.toThrow();
    });
  });

  describe('loginWithCredentials', () => {
    it('should login successfully with credentials', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
        token: 'test-token',
      };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loginWithCredentials('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local',
        role: 'user',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });

    it('should handle login failure', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Login failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.loginWithCredentials('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should clear user data and localStorage', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local' as const,
        role: 'user' as const,
      };

      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true for matching role', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local' as const,
        role: 'user' as const,
      };

      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRole('user')).toBe(true);
    });

    it('should return true for admin checking any role', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        provider: 'local' as const,
        role: 'admin' as const,
      };

      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRole('user')).toBe(true);
      expect(result.current.hasRole('customer')).toBe(true);
      expect(result.current.hasRole('admin')).toBe(true);
    });

    it('should return false for non-matching role', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local' as const,
        role: 'customer' as const,
      };

      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasRole('user')).toBe(false);
    });
  });

  describe('hasMinRole', () => {
    it('should return true when user has minimum required role', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local' as const,
        role: 'user' as const,
      };

      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMinRole('customer')).toBe(true);
      expect(result.current.hasMinRole('user')).toBe(true);
    });

    it('should return false when user does not have minimum required role', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local' as const,
        role: 'customer' as const,
      };

      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMinRole('user')).toBe(false);
      expect(result.current.hasMinRole('admin')).toBe(false);
    });

    it('should return false when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMinRole('customer')).toBe(false);
    });
  });
});

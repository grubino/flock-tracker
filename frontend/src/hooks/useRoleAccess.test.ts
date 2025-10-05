import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRoleAccess } from './useRoleAccess';
import { AuthProvider } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(AuthProvider, null, children);

describe('useRoleAccess', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('with no user', () => {
    it('should return correct values for unauthenticated user', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isUser).toBe(false);
      expect(result.current.isCustomer).toBe(false);
      expect(result.current.canRead).toBe(true);
      expect(result.current.canWrite).toBe(false);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });
  });

  describe('with customer user', () => {
    beforeEach(() => {
      const mockUser = {
        id: '1',
        email: 'customer@example.com',
        name: 'Customer User',
        provider: 'local' as const,
        role: 'customer' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));
    });

    it('should return correct role flags', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isUser).toBe(false);
      expect(result.current.isCustomer).toBe(true);
    });

    it('should return correct permissions', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.canRead).toBe(true);
      expect(result.current.canWrite).toBe(false);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });

    it('should return correct access levels', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasAccessLevel('read')).toBe(true);
      expect(result.current.hasAccessLevel('write')).toBe(false);
      expect(result.current.hasAccessLevel('delete')).toBe(false);
      expect(result.current.hasAccessLevel('admin')).toBe(false);
    });

    it('should return correct role display name', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.roleDisplayName).toBe('Customer');
    });
  });

  describe('with user role', () => {
    beforeEach(() => {
      const mockUser = {
        id: '2',
        email: 'user@example.com',
        name: 'Regular User',
        provider: 'local' as const,
        role: 'user' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));
    });

    it('should return correct role flags', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isUser).toBe(true);
      expect(result.current.isCustomer).toBe(false);
    });

    it('should return correct permissions', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.canRead).toBe(true);
      expect(result.current.canWrite).toBe(true);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });

    it('should return correct access levels', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasAccessLevel('read')).toBe(true);
      expect(result.current.hasAccessLevel('write')).toBe(true);
      expect(result.current.hasAccessLevel('delete')).toBe(false);
      expect(result.current.hasAccessLevel('admin')).toBe(false);
    });

    it('should return correct role display name', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.roleDisplayName).toBe('User');
    });
  });

  describe('with admin role', () => {
    beforeEach(() => {
      const mockUser = {
        id: '3',
        email: 'admin@example.com',
        name: 'Admin User',
        provider: 'local' as const,
        role: 'admin' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));
    });

    it('should return correct role flags', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isUser).toBe(false);
      expect(result.current.isCustomer).toBe(false);
    });

    it('should return correct permissions (all enabled)', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.canRead).toBe(true);
      expect(result.current.canWrite).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canManageUsers).toBe(true);
    });

    it('should return correct access levels (all enabled)', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasAccessLevel('read')).toBe(true);
      expect(result.current.hasAccessLevel('write')).toBe(true);
      expect(result.current.hasAccessLevel('delete')).toBe(true);
      expect(result.current.hasAccessLevel('admin')).toBe(true);
    });

    it('should return correct role display name', async () => {
      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.roleDisplayName).toBe('Administrator');
    });
  });

  describe('hasRole', () => {
    it('should correctly check roles for customer', async () => {
      const mockUser = {
        id: '1',
        email: 'customer@example.com',
        name: 'Customer User',
        provider: 'local' as const,
        role: 'customer' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // hasRole checks for exact match OR admin
      // For customer role, only 'customer' should return true (unless admin)
      expect(result.current.hasRole('customer')).toBe(true);
      expect(result.current.hasRole('user')).toBe(false);
      expect(result.current.hasRole('admin')).toBe(false);
    });

    it('should correctly check roles for user', async () => {
      const mockUser = {
        id: '2',
        email: 'user@example.com',
        name: 'Regular User',
        provider: 'local' as const,
        role: 'user' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasRole('customer')).toBe(false);
      expect(result.current.hasRole('user')).toBe(true);
      expect(result.current.hasRole('admin')).toBe(false);
    });

    it('should correctly check roles for admin (admin has all roles)', async () => {
      const mockUser = {
        id: '3',
        email: 'admin@example.com',
        name: 'Admin User',
        provider: 'local' as const,
        role: 'admin' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasRole('customer')).toBe(true);
      expect(result.current.hasRole('user')).toBe(true);
      expect(result.current.hasRole('admin')).toBe(true);
    });
  });

  describe('hasMinRole', () => {
    it('should correctly check minimum role for customer', async () => {
      const mockUser = {
        id: '1',
        email: 'customer@example.com',
        name: 'Customer User',
        provider: 'local' as const,
        role: 'customer' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasMinRole('customer')).toBe(true);
      expect(result.current.hasMinRole('user')).toBe(false);
      expect(result.current.hasMinRole('admin')).toBe(false);
    });

    it('should correctly check minimum role for user', async () => {
      const mockUser = {
        id: '2',
        email: 'user@example.com',
        name: 'Regular User',
        provider: 'local' as const,
        role: 'user' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasMinRole('customer')).toBe(true);
      expect(result.current.hasMinRole('user')).toBe(true);
      expect(result.current.hasMinRole('admin')).toBe(false);
    });

    it('should correctly check minimum role for admin', async () => {
      const mockUser = {
        id: '3',
        email: 'admin@example.com',
        name: 'Admin User',
        provider: 'local' as const,
        role: 'admin' as const,
      };
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const { result } = renderHook(() => useRoleAccess(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.hasMinRole('customer')).toBe(true);
      expect(result.current.hasMinRole('user')).toBe(true);
      expect(result.current.hasMinRole('admin')).toBe(true);
    });
  });
});

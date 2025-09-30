import { useAuth } from '../contexts/AuthContext';

/**
 * Hook that provides role-based access utilities
 */
export const useRoleAccess = () => {
  const { user, hasRole, hasMinRole } = useAuth();

  return {
    user,
    // Basic role checks
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user',
    isCustomer: user?.role === 'customer',

    // Permission checks
    canRead: true, // All authenticated users can read
    canWrite: hasMinRole('user'), // Users and admins can create/update
    canDelete: hasRole('admin'), // Only admins can delete
    canManageUsers: hasRole('admin'), // Only admins can manage users

    // Utility functions
    hasRole,
    hasMinRole,

    // Role hierarchy check
    hasAccessLevel: (level: 'read' | 'write' | 'delete' | 'admin'): boolean => {
      if (!user) return false;

      switch (level) {
        case 'read':
          return true; // All authenticated users can read
        case 'write':
          return hasMinRole('user');
        case 'delete':
          return hasRole('admin');
        case 'admin':
          return hasRole('admin');
        default:
          return false;
      }
    },

    // Display role name for UI
    roleDisplayName: user?.role ? {
      customer: 'Customer',
      user: 'User',
      admin: 'Administrator'
    }[user.role] : 'Unknown'
  };
};
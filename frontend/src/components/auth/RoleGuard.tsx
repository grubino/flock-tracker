import React from 'react';
import { useAuth, type UserRole } from '../../contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  minRole?: UserRole;
  fallback?: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Component that conditionally renders children based on user role
 *
 * @param requiredRole - Exact role required (admin always has access)
 * @param minRole - Minimum role required (higher roles also have access)
 * @param allowedRoles - Array of specific roles allowed
 * @param fallback - Component to render when access is denied
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRole,
  minRole,
  allowedRoles,
  fallback = null
}) => {
  const { user, hasRole, hasMinRole } = useAuth();

  // If user is not authenticated, deny access
  if (!user) {
    return <>{fallback}</>;
  }

  // Check specific role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>;
  }

  // Check minimum role requirement
  if (minRole && !hasMinRole(minRole)) {
    return <>{fallback}</>;
  }

  // Check allowed roles
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'admin') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Convenience components for common role checks
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard requiredRole="admin" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const UserOrAbove: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard minRole="user" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const CustomerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard requiredRole="customer" fallback={fallback}>
    {children}
  </RoleGuard>
);
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
  Card,
  Text,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Input,
  Label,
  Select,
  Spinner,
  Badge,
} from '@fluentui/react-components';
import { Edit20Regular, Key20Regular, CheckmarkCircle20Regular, DismissCircle20Regular } from '@fluentui/react-icons';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'user' | 'admin';
  provider: string;
  is_active: boolean;
  is_verified: boolean;
}

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<'customer' | 'user' | 'admin'>('customer');
  const [newPassword, setNewPassword] = useState('');

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update role');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_password: password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reset password');
      }
      return response.json();
    },
    onSuccess: () => {
      setIsPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, activate }: { userId: number; activate: boolean }) => {
      const token = localStorage.getItem('auth_token');
      const endpoint = activate ? 'activate' : 'deactivate';
      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Failed to ${activate ? 'activate' : 'deactivate'} user`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleDialogOpen(true);
  };

  const handleOpenPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsPasswordDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };

  const handleResetPassword = () => {
    if (selectedUser && newPassword) {
      resetPasswordMutation.mutate({ userId: selectedUser.id, password: newPassword });
    }
  };

  const handleToggleActive = (user: User) => {
    toggleActiveMutation.mutate({ userId: user.id, activate: !user.is_active });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, 'success' | 'warning' | 'danger'> = {
      admin: 'danger',
      user: 'success',
      customer: 'warning',
    };
    return <Badge appearance="filled" color={colors[role] || 'informative'}>{role}</Badge>;
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spinner size="large" label="Loading users..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ padding: '24px', margin: '24px' }}>
        <Text style={{ color: 'red' }}>Error loading users: {(error as Error).message}</Text>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ padding: '24px' }}>
          <Text as="h1" size={700} weight="bold" style={{ marginBottom: '24px' }}>
            User Management
          </Text>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Provider</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{user.provider}</TableCell>
                  <TableCell>
                    <Badge appearance="filled" color={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        appearance="subtle"
                        icon={<Edit20Regular />}
                        onClick={() => handleOpenRoleDialog(user)}
                      >
                        Change Role
                      </Button>
                      {user.provider === 'local' && (
                        <Button
                          appearance="subtle"
                          icon={<Key20Regular />}
                          onClick={() => handleOpenPasswordDialog(user)}
                        >
                          Reset Password
                        </Button>
                      )}
                      <Button
                        appearance="subtle"
                        icon={user.is_active ? <DismissCircle20Regular /> : <CheckmarkCircle20Regular />}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={(_, data) => setIsRoleDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <Label htmlFor="user-email">User</Label>
                  <Input id="user-email" value={selectedUser?.email || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="role-select">New Role</Label>
                  <Select
                    id="role-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'customer' | 'user' | 'admin')}
                  >
                    <option value="customer">Customer</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                {updateRoleMutation.isError && (
                  <Text style={{ color: 'red', fontSize: '14px' }}>
                    {(updateRoleMutation.error as Error).message}
                  </Text>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setIsRoleDialogOpen(false)}
                disabled={updateRoleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleUpdateRole}
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(_, data) => setIsPasswordDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <Label htmlFor="reset-user-email">User</Label>
                  <Input id="reset-user-email" value={selectedUser?.email || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                {resetPasswordMutation.isError && (
                  <Text style={{ color: 'red', fontSize: '14px' }}>
                    {(resetPasswordMutation.error as Error).message}
                  </Text>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setIsPasswordDialogOpen(false)}
                disabled={resetPasswordMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending || !newPassword}
              >
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default UserManagement;

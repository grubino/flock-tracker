import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

export type UserRole = 'customer' | 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'auth0' | 'local';
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (provider: 'google' | 'auth0') => void;
  logout: () => void;
  register: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasMinRole: (minRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication on app load
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Validate token with backend and get user info
          // For now, we'll just check if token exists
          const userData = localStorage.getItem('user_data');
          if (userData) {
            setUser(JSON.parse(userData));
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (provider: 'google' | 'auth0') => {
    // This will be handled by the respective OAuth components
    console.log(`Initiating ${provider} login`);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');

    // Clear any OAuth provider tokens
    // Google OAuth will handle its own cleanup
    // Auth0 will handle its own cleanup
  };

  const register = async (email: string, password: string, name: string, role: UserRole = 'customer') => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        name,
        role,
      });

      const data = response.data;
      const newUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        provider: 'local',
        role: data.user.role,
      };

      setUser(newUser);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(newUser));
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      const data = response.data;
      const loggedInUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        provider: 'local',
        role: data.user.role,
      };

      setUser(loggedInUser);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(loggedInUser));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Role checking functions
  const hasRole = (role: UserRole): boolean => {
    return user?.role === role || user?.role === 'admin';
  };

  const hasMinRole = (minRole: UserRole): boolean => {
    if (!user) return false;

    const roleHierarchy: Record<UserRole, number> = {
      customer: 0,
      user: 1,
      admin: 2,
    };

    return roleHierarchy[user.role] >= roleHierarchy[minRole];
  };


  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    loginWithCredentials,
    hasRole,
    hasMinRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
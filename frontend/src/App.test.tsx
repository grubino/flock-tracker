import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from './test/test-utils';
import { HomePage } from './App';

// Mock CustomerDashboard
vi.mock('./components/customer/CustomerDashboard', () => ({
  default: () => <div>Animal Catalog - Customer Dashboard</div>,
}));

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should display animals list for regular users', async () => {
    const mockUser = {
      id: '1',
      email: 'user@example.com',
      name: 'Test User',
      provider: 'local' as const,
      role: 'user' as const,
    };

    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify(mockUser));

    render(<HomePage />);

    await waitFor(() => {
      // Should show Animals list page
      expect(screen.getByText(/Animals/i)).toBeInTheDocument();
    });
  });

  it('should display customer dashboard for customer users', async () => {
    const mockUser = {
      id: '1',
      email: 'customer@example.com',
      name: 'Customer User',
      provider: 'local' as const,
      role: 'customer' as const,
    };

    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify(mockUser));

    render(<HomePage />);

    await waitFor(() => {
      // Should not show the regular dashboard
      expect(screen.queryByText(/Welcome to Flock Tracker/i)).not.toBeInTheDocument();
      // Should show customer-specific content
      expect(screen.getByText(/Animal Catalog - Customer Dashboard/i)).toBeInTheDocument();
    });
  });

  it('should have action buttons for users', async () => {
    const mockUser = {
      id: '1',
      email: 'user@example.com',
      name: 'Test User',
      provider: 'local' as const,
      role: 'user' as const,
    };

    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify(mockUser));

    render(<HomePage />);

    await waitFor(() => {
      // Should show animal list action buttons
      expect(screen.getByText(/Add Animal/i)).toBeInTheDocument();
      expect(screen.getByText(/Import CSV/i)).toBeInTheDocument();
    });
  });

  it('should display animal tabs', async () => {
    const mockUser = {
      id: '1',
      email: 'user@example.com',
      name: 'Test User',
      provider: 'local' as const,
      role: 'user' as const,
    };

    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify(mockUser));

    render(<HomePage />);

    await waitFor(() => {
      // Should show animal type tabs (Fluent UI may render text multiple times)
      expect(screen.getByText(/All Animals/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Sheep/i).length).toBeGreaterThan(0);
    });
  });

  it('should display animals list for admin users', async () => {
    const mockUser = {
      id: '2',
      email: 'admin@example.com',
      name: 'Admin User',
      provider: 'local' as const,
      role: 'admin' as const,
    };

    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify(mockUser));

    render(<HomePage />);

    await waitFor(() => {
      // Admin users also see the animals list
      expect(screen.getByText(/Animals/i)).toBeInTheDocument();
    });
  });
});

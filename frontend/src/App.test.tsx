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

  it('should display welcome message for regular users', async () => {
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
      expect(screen.getByText(/Welcome to Flock Tracker/i)).toBeInTheDocument();
      expect(screen.getByText(/Animal Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Event Tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/Location Management/i)).toBeInTheDocument();
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

  it('should have navigation links for users', async () => {
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
      expect(screen.getByText(/Manage Animals →/i)).toBeInTheDocument();
      expect(screen.getByText(/View Events →/i)).toBeInTheDocument();
      expect(screen.getByText(/Manage Locations →/i)).toBeInTheDocument();
    });
  });

  it('should display descriptive text for each section', async () => {
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
      expect(
        screen.getByText(/Track your sheep, chickens, and hives/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Record important events like deworming/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Keep track of where your animals are located/i)
      ).toBeInTheDocument();
    });
  });

  it('should display dashboard for admin users', async () => {
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
      expect(screen.getByText(/Welcome to Flock Tracker/i)).toBeInTheDocument();
    });
  });
});

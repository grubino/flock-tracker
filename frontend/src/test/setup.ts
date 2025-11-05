import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Create a mock axios instance that will be shared
const createMockAxios = () => {
  const mockInstance: any = vi.fn();

  // Add all the methods
  mockInstance.get = vi.fn(() => Promise.resolve({ data: {} }));
  mockInstance.post = vi.fn(() => Promise.resolve({ data: {} }));
  mockInstance.put = vi.fn(() => Promise.resolve({ data: {} }));
  mockInstance.delete = vi.fn(() => Promise.resolve({ data: {} }));
  mockInstance.patch = vi.fn(() => Promise.resolve({ data: {} }));
  mockInstance.request = vi.fn(() => Promise.resolve({ data: {} }));

  // Add interceptors
  mockInstance.interceptors = {
    request: {
      use: vi.fn((onFulfilled: any) => {
        mockInstance._requestInterceptor = onFulfilled;
        return 0;
      }),
      eject: vi.fn(),
    },
    response: {
      use: vi.fn((onFulfilled: any, onRejected: any) => {
        mockInstance._responseSuccessInterceptor = onFulfilled;
        mockInstance._responseErrorInterceptor = onRejected;
        return 0;
      }),
      eject: vi.fn(),
    },
  };

  // Add defaults
  mockInstance.defaults = {
    headers: {
      common: {},
    },
  };

  // Store interceptor functions for test access
  mockInstance._requestInterceptor = null;
  mockInstance._responseSuccessInterceptor = null;
  mockInstance._responseErrorInterceptor = null;

  // Make mockInstance callable as a function
  mockInstance.mockImplementation(() => Promise.resolve({ data: {} }));

  return mockInstance;
};

// Mock axios module
vi.mock('axios', () => {
  const mockAxios = createMockAxios();
  mockAxios.create = vi.fn(() => mockAxios);
  return {
    default: mockAxios,
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:8000',
    VITE_GOOGLE_CLIENT_ID: 'test-google-client-id',
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

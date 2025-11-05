import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock axios globally before any imports that might use it
vi.mock('axios', () => {
  const mockAxios: any = {
    create: vi.fn(function(this: any) {
      return this;
    }),
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    request: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: {
        use: vi.fn((onFulfilled: any) => {
          mockAxios._requestInterceptor = onFulfilled;
          return 0;
        }),
        eject: vi.fn(),
      },
      response: {
        use: vi.fn((onFulfilled: any, onRejected: any) => {
          mockAxios._responseSuccessInterceptor = onFulfilled;
          mockAxios._responseErrorInterceptor = onRejected;
          return 0;
        }),
        eject: vi.fn(),
      },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
    _requestInterceptor: null,
    _responseSuccessInterceptor: null,
    _responseErrorInterceptor: null,
  };

  // Make create return the same mockAxios instance
  mockAxios.create.mockReturnValue(mockAxios);

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

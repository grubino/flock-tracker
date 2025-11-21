import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import type { AxiosRequestConfig } from 'axios';
import { afterEach, vi, type Mock } from 'vitest';

// Create hoisted mocks to ensure they're applied before any imports
const { mockOfflineQueue, mockAxios, mockApi, mockAnimalsApi, mockEventsApi, mockLocationsApi, mockExpensesApi, mockProductsApi } = vi.hoisted(() => {
  // Create mock axios instance
  const createMockAxiosInstance = () => {
    const instance: Mock<() => AxiosRequestConfig> = vi.fn(() => Promise.resolve({ data: {} } as AxiosRequestConfig));

    // Add HTTP methods
    instance.get = vi.fn(() => Promise.resolve({ data: {} }));
    instance.post = vi.fn(() => Promise.resolve({ data: {} }));
    instance.put = vi.fn(() => Promise.resolve({ data: {} }));
    instance.delete = vi.fn(() => Promise.resolve({ data: {} }));
    instance.patch = vi.fn(() => Promise.resolve({ data: {} }));
    instance.request = vi.fn(() => Promise.resolve({ data: {} }));

    // Store interceptor callbacks for testing
    instance._requestInterceptor = null;
    instance._responseSuccessInterceptor = null;
    instance._responseErrorInterceptor = null;

    // Add interceptors that store the callbacks
    instance.interceptors = {
      request: {
        use: vi.fn((onFulfilled: any, onRejected: any) => {
          instance._requestInterceptor = onFulfilled;
          instance._requestInterceptorError = onRejected;
          return 0;
        }),
        eject: vi.fn(),
      },
      response: {
        use: vi.fn((onFulfilled: any, onRejected: any) => {
          instance._responseSuccessInterceptor = onFulfilled;
          instance._responseErrorInterceptor = onRejected;
          return 0;
        }),
        eject: vi.fn(),
      },
    };

    // Add defaults
    instance.defaults = {
      headers: {
        common: {},
      },
    };

    return instance;
  };

  const mockAxiosInstance = createMockAxiosInstance();

  return {
    mockOfflineQueue: {
      addRequest: vi.fn(),
      processQueue: vi.fn(),
      getQueueSize: vi.fn(() => 0),
    },
    mockAxios: {
      ...mockAxiosInstance,
      create: vi.fn(() => createMockAxiosInstance()),
      AxiosError: class AxiosError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'AxiosError';
        }
      },
    },
    mockApi: mockAxiosInstance,
    mockAnimalsApi: {
      getAll: vi.fn(() => Promise.resolve({ data: [] })),
      getById: vi.fn(() => Promise.resolve({ data: {} })),
      getByTag: vi.fn(() => Promise.resolve({ data: {} })),
      create: vi.fn(() => Promise.resolve({ data: {} })),
      update: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
      importCSV: vi.fn(() => Promise.resolve({ data: { success_count: 0, error_count: 0, total_rows: 0, errors: [], created_animals: [] } })),
    },
    mockEventsApi: {
      getAll: vi.fn(() => Promise.resolve({ data: [] })),
      getById: vi.fn(() => Promise.resolve({ data: {} })),
      getByAnimal: vi.fn(() => Promise.resolve({ data: [] })),
      create: vi.fn(() => Promise.resolve({ data: {} })),
      createBulk: vi.fn(() => Promise.resolve({ data: [] })),
      update: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
      importCSV: vi.fn(() => Promise.resolve({ data: { success_count: 0, error_count: 0, total_rows: 0, errors: [], created_events: [] } })),
    },
    mockLocationsApi: {
      getAll: vi.fn(() => Promise.resolve({ data: [] })),
      getById: vi.fn(() => Promise.resolve({ data: {} })),
      getByAnimal: vi.fn(() => Promise.resolve({ data: [] })),
      create: vi.fn(() => Promise.resolve({ data: {} })),
      update: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    mockExpensesApi: {
      getAll: vi.fn(() => Promise.resolve({ data: [] })),
      getById: vi.fn(() => Promise.resolve({ data: {} })),
      create: vi.fn(() => Promise.resolve({ data: {} })),
      update: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    mockProductsApi: {
      getAll: vi.fn(() => Promise.resolve({ data: [] })),
      getById: vi.fn(() => Promise.resolve({ data: {} })),
      create: vi.fn(() => Promise.resolve({ data: {} })),
      update: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
  };
});

// Mock axios BEFORE any component imports it
vi.mock('axios', () => ({
  default: mockAxios,
  AxiosError: mockAxios.AxiosError,
}));

// Mock offlineQueue BEFORE any component imports it
vi.mock('../services/offlineQueue', () => ({
  offlineQueue: mockOfflineQueue,
}));

// Mock the entire api module to prevent real axios instance creation
vi.mock('../services/api', () => ({
  default: mockApi,
  animalsApi: mockAnimalsApi,
  eventsApi: mockEventsApi,
  locationsApi: mockLocationsApi,
  expensesApi: mockExpensesApi,
  productsApi: mockProductsApi,
}));

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

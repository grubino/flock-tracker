import axios, { AxiosError } from 'axios';
import type { Animal, Event, Location, AnimalLocation, AnimalCreateRequest, EventCreateRequest, LocationCreateRequest, Expense, ExpenseCreateRequest, Vendor, VendorCreateRequest, Receipt, OCRResult, Product, ProductCreateRequest, CareSchedule, CareScheduleCreateRequest, CareCompletion, CareCompletionCreateRequest, UpcomingTask, TaskSummary } from '../types';
import { offlineQueue } from './offlineQueue';

interface QueuedError extends Error {
  isQueued: boolean;
  originalError: unknown;
}

// Get server URL from localStorage or fall back to environment variable
const getServerUrl = (): string => {
  const storedUrl = localStorage.getItem('server_url');
  return storedUrl || import.meta.env.VITE_API_URL || '';
};

const api = axios.create({
  baseURL: getServerUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token and update base URL
api.interceptors.request.use(
  (config) => {
    // Update base URL from localStorage in case it changed
    config.baseURL = getServerUrl();

    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors and offline mode
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't queue auth failures
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Handle network errors (offline mode)
    const isNetworkError = !error.response && error.code === 'ERR_NETWORK';
    const isMutatingRequest = error.config?.method && ['post', 'put', 'delete', 'patch'].includes(error.config.method.toLowerCase());

    // Queue the request if it's a network error and a mutating request
    if (isNetworkError && isMutatingRequest && error.config) {
      // Don't queue if this is already a sync request
      if (error.config.headers?.['X-Offline-Sync']) {
        return Promise.reject(error);
      }

      // Don't queue file uploads or special endpoints
      const contentType = error.config.headers?.['Content-Type'];
      const skipQueue =
        error.config.url?.includes('/upload') ||
        error.config.url?.includes('/login') ||
        error.config.url?.includes('/register') ||
        (typeof contentType === 'string' && contentType.includes('multipart/form-data'));

      if (!skipQueue) {
        console.log('[API] Network error detected, queuing request:', error.config.method, error.config.url);

        // Build full URL
        const fullUrl = error.config.baseURL
          ? `${error.config.baseURL}${error.config.url}`
          : error.config.url || '';

        await offlineQueue.addRequest({
          url: fullUrl,
          method: error.config.method || 'GET',
          data: error.config.data ? JSON.parse(error.config.data) : undefined,
          headers: {
            ...error.config.headers,
            Authorization: error.config.headers?.Authorization as string,
          } as Record<string, string>,
        });

        // Create a custom error to indicate the request was queued
        const queuedError = new Error('Request queued for offline sync') as QueuedError;
        queuedError.isQueued = true;
        queuedError.originalError = error;
        return Promise.reject(queuedError);
      }
    }

    return Promise.reject(error);
  }
);

export const animalsApi = {
  getAll: () => api.get<Animal[]>('/api/animals'),
  getById: (id: number) => api.get<Animal>(`/api/animals/${id}`),
  getByTag: (tagNumber: string) => api.get<Animal>(`/api/animals/tag/${tagNumber}`),
  create: (animal: AnimalCreateRequest) => api.post<Animal>('/api/animals', animal),
  importCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{
      success_count: number;
      error_count: number;
      total_rows: number;
      errors: string[];
      created_animals: Animal[];
    }>('/api/animals/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id: number, animal: Partial<AnimalCreateRequest>) => api.put<Animal>(`/api/animals/${id}`, animal),
  delete: (id: number) => api.delete(`/api/animals/${id}`),
};

export const eventsApi = {
  getAll: (params?: {
    event_type?: string;
    start_date?: string;
    end_date?: string;
    animal_id?: number;
  }) => api.get<Event[]>('/api/events', { params }),
  getById: (id: number) => api.get<Event>(`/api/events/${id}`),
  getByAnimal: (animalId: number) => api.get<Event[]>(`/api/events/animal/${animalId}`),
  create: (event: EventCreateRequest) => api.post<Event>('/api/events', event),
  createBulk: (events: EventCreateRequest[]) => api.post<Event[]>('/api/events/bulk', { events }),
  importCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{
      success_count: number;
      error_count: number;
      total_rows: number;
      errors: string[];
      created_events: Event[];
    }>('/api/events/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id: number, event: Partial<EventCreateRequest>) => api.put<Event>(`/api/events/${id}`, event),
  delete: (id: number) => api.delete(`/api/events/${id}`),
};

export const locationsApi = {
  getAll: () => api.get<Location[]>('/api/locations'),
  getById: (id: number) => api.get<Location>(`/api/locations/${id}`),
  getByAnimal: (animalId: number) => api.get<AnimalLocation[]>(`/api/locations/animal/${animalId}`),
  create: (location: LocationCreateRequest) => api.post<Location>('/api/locations', location),
  update: (id: number, location: Partial<LocationCreateRequest>) => api.put<Location>(`/api/locations/${id}`, location),
  delete: (id: number) => api.delete(`/api/locations/${id}`),
};

export const expensesApi = {
  getAll: (params?: {
    category?: string;
    start_date?: string;
    end_date?: string;
    vendor?: string;
    skip?: number;
    limit?: number;
  }) => api.get<Expense[]>('/api/expenses', { params }),
  getById: (id: number) => api.get<Expense>(`/api/expenses/${id}`),
  create: (expense: ExpenseCreateRequest) => api.post<Expense>('/api/expenses', expense),
  update: (id: number, expense: Partial<ExpenseCreateRequest>) => api.put<Expense>(`/api/expenses/${id}`, expense),
  delete: (id: number) => api.delete(`/api/expenses/${id}`),
};

export const vendorsApi = {
  getAll: (params?: {
    search?: string;
    skip?: number;
    limit?: number;
  }) => api.get<Vendor[]>('/api/vendors', { params }),
  getById: (id: number) => api.get<Vendor>(`/api/vendors/${id}`),
  create: (vendor: VendorCreateRequest) => api.post<Vendor>('/api/vendors', vendor),
  update: (id: number, vendor: Partial<VendorCreateRequest>) => api.put<Vendor>(`/api/vendors/${id}`, vendor),
  delete: (id: number) => api.delete(`/api/vendors/${id}`),
};

export const receiptsApi = {
  getAll: (params?: {
    skip?: number;
    limit?: number;
  }) => api.get<Receipt[]>('/api/receipts', { params }),
  getById: (id: number) => api.get<Receipt>(`/api/receipts/${id}`),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Receipt>('/api/receipts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  process: (id: number, ocrEngine?: 'tesseract' | 'easyocr' | 'got-ocr') => api.post<{
    status: string;
    task_id?: string;
    result?: OCRResult;
    message?: string;
    ocr_engine?: string;
  }>(`/api/receipts/${id}/process`, {}, {
    params: { ocr_engine: ocrEngine || 'tesseract' }
  }),
  getTaskStatus: (taskId: string) => api.get<{
    status: string;
    task_id: string;
    result?: OCRResult;
    message?: string;
    error?: string;
  }>(`/api/receipts/task/${taskId}`),
  extractExpense: (id: number) => api.post<{
    status: 'success' | 'failed';
    receipt_id: number;
    expense_data?: any;
    error?: string;
    attempts: number;
  }>(`/api/receipts/${id}/extract-expense`),
  delete: (id: number) => api.delete(`/api/receipts/${id}`),
};

export const productsApi = {
  getAll: (params?: {
    skip?: number;
    limit?: number;
    category?: string;
    is_active?: boolean;
    search?: string;
  }) => api.get<Product[]>('/api/products', { params }),
  getById: (id: number) => api.get<Product>(`/api/products/${id}`),
  create: (product: ProductCreateRequest) => api.post<Product>('/api/products', product),
  update: (id: number, product: Partial<ProductCreateRequest>) => api.put<Product>(`/api/products/${id}`, product),
  delete: (id: number) => api.delete(`/api/products/${id}`),
};

export const careSchedulesApi = {
  getAll: (params?: {
    skip?: number;
    limit?: number;
    animal_id?: number;
    location_id?: number;
    care_type?: string;
    status?: string;
    assigned_to_id?: number;
  }) => api.get<CareSchedule[]>('/api/care-schedules', { params }),
  getById: (id: number) => api.get<CareSchedule>(`/api/care-schedules/${id}`),
  getUpcoming: (params?: {
    days?: number;
    assigned_to_id?: number;
  }) => api.get<UpcomingTask[]>('/api/care-schedules/upcoming', { params }),
  getOverdue: (params?: {
    assigned_to_id?: number;
  }) => api.get<CareSchedule[]>('/api/care-schedules/overdue', { params }),
  getSummary: (params?: {
    assigned_to_id?: number;
  }) => api.get<TaskSummary>('/api/care-schedules/summary', { params }),
  create: (schedule: CareScheduleCreateRequest) => api.post<CareSchedule>('/api/care-schedules', schedule),
  update: (id: number, schedule: Partial<CareScheduleCreateRequest>) => api.put<CareSchedule>(`/api/care-schedules/${id}`, schedule),
  delete: (id: number) => api.delete(`/api/care-schedules/${id}`),
};

export const careCompletionsApi = {
  getAll: (params?: {
    schedule_id?: number;
    skip?: number;
    limit?: number;
  }) => api.get<CareCompletion[]>('/api/care-schedules/completions', { params }),
  getById: (id: number) => api.get<CareCompletion>(`/api/care-schedules/completions/${id}`),
  create: (completion: CareCompletionCreateRequest) => api.post<CareCompletion>('/api/care-schedules/completions', completion),
  update: (id: number, completion: Partial<CareCompletionCreateRequest>) => api.put<CareCompletion>(`/api/care-schedules/completions/${id}`, completion),
  delete: (id: number) => api.delete(`/api/care-schedules/completions/${id}`),
};

export default api;
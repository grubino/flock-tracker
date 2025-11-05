import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';

// Import after axios is mocked globally in setup.ts
import axiosInstance, { apiClient } from './api-client';

// Get reference to the mocked axios
const mockAxios = axios as any;

describe('api-client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as any).location;
  });

  describe('axiosInstance configuration', () => {
    it('should have request and response interceptors', () => {
      expect(mockAxiosInstance._requestInterceptor).toBeDefined();
      expect(mockAxiosInstance._responseSuccessInterceptor).toBeDefined();
      expect(mockAxiosInstance._responseErrorInterceptor).toBeDefined();
    });
  });

  describe('request interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      localStorage.setItem('auth_token', 'test-token');

      const mockConfig: any = {
        headers: {},
      };

      // Access the request interceptor
      const requestInterceptor = (axiosInstance as any)._requestInterceptor;
      const result = await requestInterceptor(mockConfig);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should not add Authorization header when token does not exist', async () => {
      const mockConfig: any = {
        headers: {},
      };

      const requestInterceptor = (axiosInstance as any)._requestInterceptor;
      const result = await requestInterceptor(mockConfig);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    beforeEach(() => {
      // Mock window.location
      delete (window as any).location;
      (window as any).location = { pathname: '/animals', href: '' };
    });

    it('should pass through successful responses', async () => {
      const mockResponse = { data: { success: true } };

      const responseInterceptor = (axiosInstance as any)._responseSuccessInterceptor;
      const result = await responseInterceptor(mockResponse);

      expect(result).toBe(mockResponse);
    });

    it('should clear auth data and redirect on 401 error', async () => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify({ id: '1' }));

      const mockError = {
        response: {
          status: 401,
        },
      };

      const errorInterceptor = (axiosInstance as any)._responseErrorInterceptor;

      await expect(errorInterceptor(mockError)).rejects.toEqual(mockError);

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
      expect((window as any).location.href).toBe('/login');
    });

    it('should clear auth data and redirect on 403 error', async () => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user_data', JSON.stringify({ id: '1' }));

      const mockError = {
        response: {
          status: 403,
        },
      };

      const errorInterceptor = (axiosInstance as any)._responseErrorInterceptor;

      await expect(errorInterceptor(mockError)).rejects.toEqual(mockError);

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
      expect((window as any).location.href).toBe('/login');
    });

    it('should not redirect if already on login page', async () => {
      (window as any).location.pathname = '/login';

      const mockError = {
        response: {
          status: 401,
        },
      };

      const errorInterceptor = (axiosInstance as any)._responseErrorInterceptor;

      await expect(errorInterceptor(mockError)).rejects.toEqual(mockError);

      expect((window as any).location.href).toBe('');
    });

    it('should pass through other errors without redirecting', async () => {
      const mockError = {
        response: {
          status: 500,
        },
      };

      const errorInterceptor = (axiosInstance as any)._responseErrorInterceptor;

      await expect(errorInterceptor(mockError)).rejects.toEqual(mockError);

      expect((window as any).location.href).toBe('');
    });

    it('should handle errors without response object', async () => {
      const mockError = {
        message: 'Network Error',
      };

      const errorInterceptor = (axiosInstance as any)._responseErrorInterceptor;

      await expect(errorInterceptor(mockError)).rejects.toEqual(mockError);

      expect((window as any).location.href).toBe('');
    });
  });

  describe('apiClient wrapper', () => {
    it('should return response data from axios call', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockResponse = { data: mockData };

      vi.mocked(axiosInstance).mockResolvedValueOnce(mockResponse);

      const config = { url: '/api/test', method: 'GET' };
      const result = await apiClient(config);

      expect(result).toEqual(mockData);
      expect(axiosInstance).toHaveBeenCalledWith(config);
    });

    it('should handle POST requests', async () => {
      const mockData = { id: 1, name: 'Created' };
      const mockResponse = { data: mockData };

      vi.mocked(axiosInstance).mockResolvedValueOnce(mockResponse);

      const config = {
        url: '/api/test',
        method: 'POST',
        data: { name: 'Created' },
      };

      const result = await apiClient(config);

      expect(result).toEqual(mockData);
      expect(axiosInstance).toHaveBeenCalledWith(config);
    });

    it('should propagate errors', async () => {
      const mockError = new Error('Request failed');

      vi.mocked(axiosInstance).mockRejectedValueOnce(mockError);

      const config = { url: '/api/test', method: 'GET' };

      await expect(apiClient(config)).rejects.toThrow('Request failed');
    });
  });
});

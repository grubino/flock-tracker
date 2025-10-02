import axios from 'axios';
import type { Animal, Event, Location, AnimalLocation, AnimalCreateRequest, EventCreateRequest, LocationCreateRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
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

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear auth data and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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
  update: (id: number, animal: Partial<AnimalCreateRequest>) => api.put<Animal>(`/api/animals/${id}`, animal),
  delete: (id: number) => api.delete(`/api/animals/${id}`),
};

export const eventsApi = {
  getAll: () => api.get<Event[]>('/api/events'),
  getById: (id: number) => api.get<Event>(`/api/events/${id}`),
  getByAnimal: (animalId: number) => api.get<Event[]>(`/api/events/animal/${animalId}`),
  create: (event: EventCreateRequest) => api.post<Event>('/api/events', event),
  createBulk: (events: EventCreateRequest[]) => api.post<Event[]>('/api/events/bulk', { events }),
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

export default api;
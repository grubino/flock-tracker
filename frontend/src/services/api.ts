import axios from 'axios';
import type { Animal, Event, Location, AnimalLocation, AnimalCreateRequest, EventCreateRequest, LocationCreateRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
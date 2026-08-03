import api from './api';
import type { Trip, TripStop } from '../types/trip';

export const tripService = {
  async getTrip(tripId: string): Promise<Trip> {
    const response = await api.get(`/trips/${tripId}`);
    return response.data;
  },

  async createTrip(data: any): Promise<Trip> {
    const response = await api.post('/trips', data);
    return response.data;
  },

  async generateAIPlan(tripId: string): Promise<TripStop[]> {
    const response = await api.post(`/trips/${tripId}/generate`);
    return response.data.stops;
  },

  async generateAISupplement(tripId: string): Promise<TripStop[]> {
    const response = await api.post(`/trips/${tripId}/supplement`);
    return response.data.newStops;
  },

  async addStop(tripId: string, data: Partial<TripStop>): Promise<TripStop> {
    const response = await api.post(`/trips/${tripId}/stops`, data);
    return response.data;
  },

  async updateStop(tripId: string, stopId: string, data: Partial<TripStop>): Promise<TripStop> {
    const response = await api.patch(`/trips/${tripId}/stops/${stopId}`, data);
    return response.data;
  },

  async deleteStop(tripId: string, stopId: string): Promise<void> {
    await api.delete(`/trips/${tripId}/stops/${stopId}`);
  },

  async reorderStops(tripId: string, stopIds: string[]): Promise<void> {
    await api.patch(`/trips/${tripId}/stops/reorder`, { stopIds });
  },

  async publishTrip(tripId: string): Promise<Trip> {
    const response = await api.patch(`/trips/${tripId}/publish`);
    return response.data;
  },

  async searchPlaces(keyword: string, lat?: number, lng?: number, radiusKm?: number): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('keyword', keyword);
    if (lat) params.append('lat', lat.toString());
    if (lng) params.append('lng', lng.toString());
    if (radiusKm) params.append('radiusKm', radiusKm.toString());
    
    const response = await api.get(`/trips/places/search?${params.toString()}`);
    return response.data;
  }
};

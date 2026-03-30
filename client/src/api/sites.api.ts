import apiClient from './client';
import type { Site, ApiResponse } from '@oblifield/shared';

export const sitesApi = {
  async list(filters?: { clientId?: number; country?: string }): Promise<Site[]> {
    const res = await apiClient.get<ApiResponse<Site[]>>('/sites', { params: filters });
    return res.data.data!;
  },

  async getById(id: number): Promise<Site> {
    const res = await apiClient.get<ApiResponse<Site>>(`/sites/${id}`);
    return res.data.data!;
  },

  async create(data: Partial<Site>): Promise<Site> {
    const res = await apiClient.post<ApiResponse<Site>>('/sites', data);
    return res.data.data!;
  },

  async update(id: number, data: Partial<Site>): Promise<Site> {
    const res = await apiClient.put<ApiResponse<Site>>(`/sites/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/sites/${id}`);
  },

  async getCountries(): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<string[]>>('/sites/countries');
    return res.data.data!;
  },
};

import apiClient from './client';
import type { Technician, TechnicianStatus, ApiResponse } from '@oblifield/shared';

export const techniciansApi = {
  async list(): Promise<Technician[]> {
    const res = await apiClient.get<ApiResponse<Technician[]>>('/technicians');
    return res.data.data!;
  },

  async getAvailable(): Promise<Technician[]> {
    const res = await apiClient.get<ApiResponse<Technician[]>>('/technicians/available');
    return res.data.data!;
  },

  async getById(id: number): Promise<Technician> {
    const res = await apiClient.get<ApiResponse<Technician>>(`/technicians/${id}`);
    return res.data.data!;
  },

  async create(data: { userId: number; phone?: string; specialties?: string[] }): Promise<Technician> {
    const res = await apiClient.post<ApiResponse<Technician>>('/technicians', data);
    return res.data.data!;
  },

  async update(id: number, data: Partial<{ phone: string; specialties: string[] }>): Promise<Technician> {
    const res = await apiClient.put<ApiResponse<Technician>>(`/technicians/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/technicians/${id}`);
  },

  async updateStatus(id: number, status: TechnicianStatus): Promise<Technician> {
    const res = await apiClient.post<ApiResponse<Technician>>(`/technicians/${id}/status`, { status });
    return res.data.data!;
  },

  async updateLocation(id: number, latitude: number, longitude: number): Promise<void> {
    await apiClient.post(`/technicians/${id}/location`, { latitude, longitude });
  },
};

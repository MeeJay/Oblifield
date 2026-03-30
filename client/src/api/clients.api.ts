import apiClient from './client';
import type { Client, ClientTreeNode, ApiResponse } from '@oblifield/shared';

export const clientsApi = {
  async list(): Promise<Client[]> {
    const res = await apiClient.get<ApiResponse<Client[]>>('/clients');
    return res.data.data!;
  },

  async tree(): Promise<ClientTreeNode[]> {
    const res = await apiClient.get<ApiResponse<ClientTreeNode[]>>('/clients/tree');
    return res.data.data!;
  },

  async getById(id: number): Promise<Client> {
    const res = await apiClient.get<ApiResponse<Client>>(`/clients/${id}`);
    return res.data.data!;
  },

  async create(data: Partial<Client>): Promise<Client> {
    const res = await apiClient.post<ApiResponse<Client>>('/clients', data);
    return res.data.data!;
  },

  async update(id: number, data: Partial<Client>): Promise<Client> {
    const res = await apiClient.put<ApiResponse<Client>>(`/clients/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/clients/${id}`);
  },

  async getStats(): Promise<Record<number, { total: number; pending: number; inProgress: number; done: number }>> {
    const res = await apiClient.get<ApiResponse<Record<number, { total: number; pending: number; inProgress: number; done: number }>>>('/clients/stats');
    return res.data.data!;
  },

};

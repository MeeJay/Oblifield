import apiClient from './client';
import type { StepTemplate, ApiResponse } from '@oblifield/shared';

export const stepTemplatesApi = {
  async list(): Promise<StepTemplate[]> {
    const res = await apiClient.get<ApiResponse<StepTemplate[]>>('/step-templates');
    return res.data.data!;
  },

  async getById(id: number): Promise<StepTemplate> {
    const res = await apiClient.get<ApiResponse<StepTemplate>>(`/step-templates/${id}`);
    return res.data.data!;
  },

  async create(data: {
    name: string;
    description?: string | null;
    items: Array<{ label: string; description?: string | null }>;
  }): Promise<StepTemplate> {
    const res = await apiClient.post<ApiResponse<StepTemplate>>('/step-templates', data);
    return res.data.data!;
  },

  async update(id: number, data: {
    name?: string;
    description?: string | null;
    items?: Array<{ label: string; description?: string | null }>;
  }): Promise<StepTemplate> {
    const res = await apiClient.put<ApiResponse<StepTemplate>>(`/step-templates/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/step-templates/${id}`);
  },
};

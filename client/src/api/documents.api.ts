import apiClient from './client';
import type { DocDocument, InterventionDocument, ApiResponse } from '@oblifield/shared';

export const documentsApi = {
  async list(params?: { categoryId?: number; search?: string }): Promise<DocDocument[]> {
    const res = await apiClient.get<ApiResponse<DocDocument[]>>('/documents', { params });
    return res.data.data!;
  },

  async getById(id: number): Promise<DocDocument> {
    const res = await apiClient.get<ApiResponse<DocDocument>>(`/documents/${id}`);
    return res.data.data!;
  },

  async create(data: { title: string; content?: string; categoryId: number; sortOrder?: number }): Promise<DocDocument> {
    const res = await apiClient.post<ApiResponse<DocDocument>>('/documents', data);
    return res.data.data!;
  },

  async update(id: number, data: Partial<{ title: string; content: string; categoryId: number; sortOrder: number }>): Promise<DocDocument> {
    const res = await apiClient.put<ApiResponse<DocDocument>>(`/documents/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  // Intervention document attachments
  async getInterventionDocs(interventionId: number): Promise<InterventionDocument[]> {
    const res = await apiClient.get<ApiResponse<InterventionDocument[]>>(`/interventions/${interventionId}/documents`);
    return res.data.data!;
  },

  async attachToIntervention(interventionId: number, documentId: number): Promise<InterventionDocument[]> {
    const res = await apiClient.post<ApiResponse<InterventionDocument[]>>(`/interventions/${interventionId}/documents`, { documentId });
    return res.data.data!;
  },

  async detachFromIntervention(interventionId: number, documentId: number): Promise<void> {
    await apiClient.delete(`/interventions/${interventionId}/documents/${documentId}`);
  },
};

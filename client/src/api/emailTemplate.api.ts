import apiClient from './client';
import type { EmailTemplate, ApiResponse } from '@oblifield/shared';

export const emailTemplateApi = {
  async list(): Promise<EmailTemplate[]> {
    const res = await apiClient.get<ApiResponse<EmailTemplate[]>>('/admin/email-templates');
    return res.data.data!;
  },

  async getById(id: number): Promise<EmailTemplate> {
    const res = await apiClient.get<ApiResponse<EmailTemplate>>(`/admin/email-templates/${id}`);
    return res.data.data!;
  },

  async create(data: { slug: string; language: string; subject: string; bodyHtml: string; enabled?: boolean }): Promise<EmailTemplate> {
    const res = await apiClient.post<ApiResponse<EmailTemplate>>('/admin/email-templates', data);
    return res.data.data!;
  },

  async update(id: number, data: Partial<{ subject: string; bodyHtml: string; enabled: boolean }>): Promise<EmailTemplate> {
    const res = await apiClient.put<ApiResponse<EmailTemplate>>(`/admin/email-templates/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/email-templates/${id}`);
  },

  async preview(id: number): Promise<{ subject: string; html: string }> {
    const res = await apiClient.post<ApiResponse<{ subject: string; html: string }>>(`/admin/email-templates/${id}/preview`);
    return res.data.data!;
  },

  async testSend(id: number, email: string): Promise<void> {
    await apiClient.post(`/admin/email-templates/${id}/test-send`, { email });
  },
};

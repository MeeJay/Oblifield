import apiClient from './client';
import type { DocCategory, DocCategoryTreeNode, ApiResponse } from '@oblifield/shared';

export const docCategoriesApi = {
  async list(): Promise<DocCategory[]> {
    const res = await apiClient.get<ApiResponse<DocCategory[]>>('/doc-categories');
    return res.data.data!;
  },

  async tree(): Promise<DocCategoryTreeNode[]> {
    const res = await apiClient.get<ApiResponse<DocCategoryTreeNode[]>>('/doc-categories/tree');
    return res.data.data!;
  },

  async getById(id: number): Promise<DocCategory> {
    const res = await apiClient.get<ApiResponse<DocCategory>>(`/doc-categories/${id}`);
    return res.data.data!;
  },

  async create(data: { name: string; description?: string | null; parentId?: number | null; sortOrder?: number }): Promise<DocCategory> {
    const res = await apiClient.post<ApiResponse<DocCategory>>('/doc-categories', data);
    return res.data.data!;
  },

  async update(id: number, data: Partial<{ name: string; description: string | null; parentId: number | null; sortOrder: number }>): Promise<DocCategory> {
    const res = await apiClient.put<ApiResponse<DocCategory>>(`/doc-categories/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/doc-categories/${id}`);
  },
};

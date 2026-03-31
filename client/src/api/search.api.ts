import apiClient from './client';
import type { SearchResult, ApiResponse } from '@oblifield/shared';

export const searchApi = {
  async search(query: string): Promise<SearchResult[]> {
    const res = await apiClient.get<ApiResponse<SearchResult[]>>('/search', { params: { q: query } });
    return res.data.data!;
  },
};

import apiClient from './client';
import type { RecurringSchedule, ApiResponse } from '@oblifield/shared';

export const recurringSchedulesApi = {
  async list(): Promise<RecurringSchedule[]> {
    const res = await apiClient.get<ApiResponse<RecurringSchedule[]>>('/recurring-schedules');
    return res.data.data!;
  },

  async getById(id: number): Promise<RecurringSchedule> {
    const res = await apiClient.get<ApiResponse<RecurringSchedule>>(`/recurring-schedules/${id}`);
    return res.data.data!;
  },

  async create(data: Partial<RecurringSchedule>): Promise<RecurringSchedule> {
    const res = await apiClient.post<ApiResponse<RecurringSchedule>>('/recurring-schedules', data);
    return res.data.data!;
  },

  async update(id: number, data: Partial<RecurringSchedule>): Promise<RecurringSchedule> {
    const res = await apiClient.put<ApiResponse<RecurringSchedule>>(`/recurring-schedules/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/recurring-schedules/${id}`);
  },

  async processNow(): Promise<{ created: number }> {
    const res = await apiClient.post<ApiResponse<{ created: number }>>('/recurring-schedules/process');
    return res.data.data!;
  },
};

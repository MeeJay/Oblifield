import apiClient from './client';
import type { ApiResponse } from '@oblifield/shared';

export interface ReportSummary {
  total: number;
  avgDurationMinutes: number | null;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export interface TechnicianReport {
  technicianId: number;
  technicianName: string;
  completedCount: number;
  avgDurationMinutes: number | null;
  totalHours: number | null;
}

export interface ClientReport {
  clientId: number;
  clientName: string;
  interventions: Array<{ id: number; title: string; status: string; type: string; completedAt: string | null }>;
}

export const reportsApi = {
  async getSummary(from?: string, to?: string): Promise<ReportSummary> {
    const res = await apiClient.get<ApiResponse<ReportSummary>>('/reports/summary', { params: { from, to } });
    return res.data.data!;
  },

  async getTechnicianReport(technicianId: number, from?: string, to?: string): Promise<TechnicianReport> {
    const res = await apiClient.get<ApiResponse<TechnicianReport>>(`/reports/technician/${technicianId}`, {
      params: { from, to },
    });
    return res.data.data!;
  },

  async getClientReport(clientId: number, from?: string, to?: string): Promise<ClientReport> {
    const res = await apiClient.get<ApiResponse<ClientReport>>(`/reports/client/${clientId}`, {
      params: { from, to },
    });
    return res.data.data!;
  },

  getExportCsvUrl(from?: string, to?: string): string {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `/api/reports/export/csv${params.toString() ? '?' + params.toString() : ''}`;
  },
};

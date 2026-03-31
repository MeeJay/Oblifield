import apiClient from './client';
import type { AuditLog, ApiResponse } from '@oblifield/shared';

export const auditLogsApi = {
  async list(filters?: { entityType?: string; entityId?: number; userId?: number; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const res = await apiClient.get<ApiResponse<AuditLog[]>>('/audit-logs', { params: filters });
    return res.data.data!;
  },

  async getByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    const res = await apiClient.get<ApiResponse<AuditLog[]>>(`/audit-logs/entity/${entityType}/${entityId}`);
    return res.data.data!;
  },
};

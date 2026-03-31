import { db } from '../db';
import type { AuditLog } from '@oblifield/shared';

interface AuditLogRow {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_label: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  tenant_id: number;
  created_at: Date;
}

function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label ?? null,
    changes: (row.changes as Record<string, { old: unknown; new: unknown }>) ?? null,
    ipAddress: row.ip_address ?? null,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
  };
}

export const auditService = {
  async log(data: {
    userId: number | null;
    username: string | null;
    action: string;
    entityType: string;
    entityId: number | null;
    entityLabel: string | null;
    changes: Record<string, unknown> | null;
    ipAddress: string | null;
    tenantId: number;
  }): Promise<AuditLog> {
    const [row] = await db('audit_logs')
      .insert({
        user_id: data.userId,
        username: data.username ?? null,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId ?? null,
        entity_label: data.entityLabel ?? null,
        changes: data.changes ? JSON.stringify(data.changes) : null,
        ip_address: data.ipAddress ?? null,
        tenant_id: data.tenantId,
      })
      .returning('*');

    return rowToAuditLog(row);
  },

  async getAll(
    tenantId: number,
    filters?: {
      entityType?: string;
      entityId?: number;
      userId?: number;
      limit?: number;
      offset?: number;
    },
  ): Promise<AuditLog[]> {
    const q = db('audit_logs')
      .where({ tenant_id: tenantId })
      .orderBy('created_at', 'desc');

    if (filters?.entityType) q.where('entity_type', filters.entityType);
    if (filters?.entityId) q.where('entity_id', filters.entityId);
    if (filters?.userId) q.where('user_id', filters.userId);

    q.limit(filters?.limit ?? 50);
    if (filters?.offset) q.offset(filters.offset);

    const rows = await q;
    return rows.map(rowToAuditLog);
  },

  async getByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    const rows = await db('audit_logs')
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('created_at', 'desc');

    return rows.map(rowToAuditLog);
  },
};

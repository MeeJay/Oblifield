import { db } from '../db';

export interface ReportSummary {
  total: number;
  avgDurationMinutes: number | null;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export interface TechnicianReportData {
  technicianId: number;
  technicianName: string;
  completedCount: number;
  avgDurationMinutes: number | null;
  totalHours: number | null;
}

export const reportService = {
  async getSummary(tenantId: number, from?: string, to?: string): Promise<ReportSummary> {
    let q = db('interventions').where({ tenant_id: tenantId });
    if (from) q = q.where('created_at', '>=', from);
    if (to) q = q.where('created_at', '<=', to);

    const total = await q.clone().count('* as count').first();

    // Avg duration for completed interventions (started_at to completed_at)
    const avgDur = await q.clone()
      .whereNotNull('started_at')
      .whereNotNull('completed_at')
      .select(db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_minutes'))
      .first();

    // By status
    const statusRows = await q.clone().groupBy('status').select('status').count('* as count');
    const byStatus: Record<string, number> = {};
    for (const r of statusRows) byStatus[r.status as string] = Number(r.count);

    // By type
    const typeRows = await q.clone().groupBy('type').select('type').count('* as count');
    const byType: Record<string, number> = {};
    for (const r of typeRows) byType[r.type as string] = Number(r.count);

    return {
      total: Number(total?.count ?? 0),
      avgDurationMinutes: avgDur?.avg_minutes ? Math.round(Number(avgDur.avg_minutes)) : null,
      byStatus,
      byType,
    };
  },

  async getTechnicianReport(tenantId: number, technicianId: number, from?: string, to?: string): Promise<TechnicianReportData> {
    // Get technician display name
    const tech = await db('technicians')
      .leftJoin('users', 'technicians.user_id', 'users.id')
      .where('technicians.id', technicianId)
      .select('users.display_name', 'users.username')
      .first();

    let q = db('interventions')
      .where({ tenant_id: tenantId, assigned_technician_id: technicianId });
    if (from) q = q.where('created_at', '>=', from);
    if (to) q = q.where('created_at', '<=', to);

    const completedQ = q.clone().where('status', 'done');
    const completedCount = await completedQ.clone().count('* as count').first();
    const avgDur = await completedQ.clone()
      .whereNotNull('started_at')
      .whereNotNull('completed_at')
      .select(db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_minutes'))
      .first();
    const totalHours = await completedQ.clone()
      .whereNotNull('started_at')
      .whereNotNull('completed_at')
      .select(db.raw('SUM(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600) as total_hours'))
      .first();

    return {
      technicianId,
      technicianName: tech?.display_name || tech?.username || 'Unknown',
      completedCount: Number(completedCount?.count ?? 0),
      avgDurationMinutes: avgDur?.avg_minutes ? Math.round(Number(avgDur.avg_minutes)) : null,
      totalHours: totalHours?.total_hours ? Math.round(Number(totalHours.total_hours) * 10) / 10 : null,
    };
  },

  async getClientReport(tenantId: number, clientId: number, from?: string, to?: string) {
    const client = await db('clients').where({ id: clientId }).select('name').first();

    let q = db('interventions')
      .where({ tenant_id: tenantId, client_id: clientId });
    if (from) q = q.where('created_at', '>=', from);
    if (to) q = q.where('created_at', '<=', to);

    const interventions = await q.orderBy('created_at', 'desc')
      .select('id', 'title', 'status', 'type', 'completed_at');

    return {
      clientId,
      clientName: client?.name || 'Unknown',
      interventions: interventions.map((r: any) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        type: r.type,
        completedAt: r.completed_at?.toISOString() ?? null,
      })),
    };
  },

  async exportCsv(tenantId: number, from?: string, to?: string): Promise<string> {
    let q = db('interventions as i')
      .leftJoin('technicians as t', 'i.assigned_technician_id', 't.id')
      .leftJoin('users as u', 't.user_id', 'u.id')
      .leftJoin('clients as c', 'i.client_id', 'c.id')
      .where('i.tenant_id', tenantId);
    if (from) q = q.where('i.created_at', '>=', from);
    if (to) q = q.where('i.created_at', '<=', to);

    const rows = await q.orderBy('i.created_at', 'desc').select(
      'i.id', 'i.title', 'i.type', 'i.status', 'i.priority',
      'c.name as client_name', 'c.country as client_country',
      'u.display_name as technician_name',
      'i.scheduled_at', 'i.started_at', 'i.completed_at',
      'i.address', 'i.estimated_duration_minutes',
    );

    // Build CSV
    const headers = ['ID', 'Title', 'Type', 'Status', 'Priority', 'Client', 'Country', 'Technician', 'Scheduled', 'Started', 'Completed', 'Address', 'Est. Duration (min)'];
    const csvRows = rows.map((r: any) => [
      r.id,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.type, r.status, r.priority,
      `"${(r.client_name || '').replace(/"/g, '""')}"`,
      r.client_country || '',
      `"${(r.technician_name || '').replace(/"/g, '""')}"`,
      r.scheduled_at?.toISOString() || '',
      r.started_at?.toISOString() || '',
      r.completed_at?.toISOString() || '',
      `"${(r.address || '').replace(/"/g, '""')}"`,
      r.estimated_duration_minutes || '',
    ].join(','));

    return [headers.join(','), ...csvRows].join('\n');
  },
};

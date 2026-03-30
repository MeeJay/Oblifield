import { db } from '../db';
import type { Intervention, InterventionStatus, InterventionType, InterventionPriority } from '@oblifield/shared';

interface InterventionRow {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  client_id: number | null;
  site_id: number | null;
  assigned_technician_id: number | null;
  assigned_technician_name: string | null;
  client_name: string | null;
  site_name: string | null;
  scheduled_at: Date | null;
  due_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  estimated_duration_minutes: number | null;
  supervisor_name: string | null;
  ticket_reference: string | null;
  created_by: number | null;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

function interventionBaseQuery(tenantId?: number) {
  const q = db('interventions')
    .leftJoin('technicians as t', 'interventions.assigned_technician_id', 't.id')
    .leftJoin('users as u', 't.user_id', 'u.id')
    .leftJoin('clients as c', 'interventions.client_id', 'c.id')
    .leftJoin('sites as s', 'interventions.site_id', 's.id')
    .select(
      'interventions.*',
      'u.display_name as assigned_technician_name',
      'c.name as client_name',
      's.name as site_name',
    );
  if (tenantId !== undefined) {
    q.where('interventions.tenant_id', tenantId);
  }
  return q;
}

function rowToIntervention(row: InterventionRow): Intervention {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as InterventionType,
    status: row.status as InterventionStatus,
    priority: row.priority as InterventionPriority,
    clientId: row.client_id,
    siteId: row.site_id,
    assignedTechnicianId: row.assigned_technician_id,
    assignedTechnicianName: row.assigned_technician_name ?? null,
    clientName: row.client_name ?? null,
    siteName: row.site_name ?? null,
    scheduledAt: row.scheduled_at ? row.scheduled_at.toISOString() : null,
    dueAt: row.due_at ? row.due_at.toISOString() : null,
    startedAt: row.started_at ? row.started_at.toISOString() : null,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    supervisorName: row.supervisor_name,
    ticketReference: row.ticket_reference,
    createdBy: row.created_by,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const interventionService = {
  async getAll(
    tenantId: number,
    filters?: { status?: InterventionStatus; technicianId?: number; clientId?: number },
  ): Promise<Intervention[]> {
    const q = interventionBaseQuery(tenantId).orderBy('interventions.created_at', 'desc');

    if (filters?.status) q.where('interventions.status', filters.status);
    if (filters?.technicianId) q.where('interventions.assigned_technician_id', filters.technicianId);
    if (filters?.clientId) q.where('interventions.client_id', filters.clientId);

    const rows = await q;
    return rows.map(rowToIntervention);
  },

  async getById(id: number): Promise<Intervention | null> {
    const row = await interventionBaseQuery().where('interventions.id', id).first();
    return row ? rowToIntervention(row) : null;
  },

  async create(
    data: {
      title: string;
      description?: string | null;
      type?: InterventionType;
      priority?: InterventionPriority;
      clientId?: number | null;
      siteId?: number | null;
      assignedTechnicianId?: number | null;
      scheduledAt?: string | null;
      dueAt?: string | null;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      contactName?: string | null;
      contactPhone?: string | null;
      contactEmail?: string | null;
      estimatedDurationMinutes?: number | null;
      supervisorName?: string | null;
      ticketReference?: string | null;
    },
    tenantId: number,
    createdBy: number,
  ): Promise<Intervention> {
    const status: InterventionStatus = data.assignedTechnicianId ? 'assigned' : 'pending';

    const [row] = await db('interventions')
      .insert({
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'other',
        status,
        priority: data.priority ?? 'normal',
        client_id: data.clientId ?? null,
        site_id: data.siteId ?? null,
        assigned_technician_id: data.assignedTechnicianId ?? null,
        scheduled_at: data.scheduledAt ?? null,
        due_at: data.dueAt ?? null,
        address: data.address ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        contact_name: data.contactName ?? null,
        contact_phone: data.contactPhone ?? null,
        contact_email: data.contactEmail ?? null,
        estimated_duration_minutes: data.estimatedDurationMinutes ?? null,
        supervisor_name: data.supervisorName ?? null,
        ticket_reference: data.ticketReference ?? null,
        created_by: createdBy,
        tenant_id: tenantId,
      })
      .returning('*');

    // Re-fetch with joins to get display names
    return (await this.getById(row.id))!;
  },

  async update(
    id: number,
    data: Partial<{
      title: string;
      description: string | null;
      type: InterventionType;
      priority: InterventionPriority;
      clientId: number | null;
      siteId: number | null;
      assignedTechnicianId: number | null;
      scheduledAt: string | null;
      dueAt: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      contactName: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
      estimatedDurationMinutes: number | null;
    }>,
  ): Promise<Intervention | null> {
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.clientId !== undefined) updateData.client_id = data.clientId;
    if (data.siteId !== undefined) updateData.site_id = data.siteId;
    if (data.assignedTechnicianId !== undefined) updateData.assigned_technician_id = data.assignedTechnicianId;
    if (data.scheduledAt !== undefined) updateData.scheduled_at = data.scheduledAt;
    if (data.dueAt !== undefined) updateData.due_at = data.dueAt;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.contactName !== undefined) updateData.contact_name = data.contactName;
    if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone;
    if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail;
    if (data.estimatedDurationMinutes !== undefined) updateData.estimated_duration_minutes = data.estimatedDurationMinutes;
    if (data.supervisorName !== undefined) updateData.supervisor_name = data.supervisorName;
    if (data.ticketReference !== undefined) updateData.ticket_reference = data.ticketReference;

    const [row] = await db('interventions')
      .where({ id })
      .update(updateData)
      .returning('*');

    if (!row) return null;

    // Re-fetch with joins to get display names
    return this.getById(row.id);
  },

  async delete(id: number): Promise<void> {
    await db('interventions').where({ id }).del();
  },

  async changeStatus(id: number, newStatus: InterventionStatus): Promise<Intervention | null> {
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date(),
    };

    if (newStatus === 'in_progress') {
      updateData.started_at = new Date();
    } else if (newStatus === 'done') {
      updateData.completed_at = new Date();
    }

    const [row] = await db('interventions')
      .where({ id })
      .update(updateData)
      .returning('*');

    if (!row) return null;
    return this.getById(row.id);
  },

  async assign(id: number, technicianId: number | null): Promise<Intervention | null> {
    const updateData: Record<string, unknown> = {
      assigned_technician_id: technicianId,
      updated_at: new Date(),
    };

    // Auto-set status to 'assigned' if currently pending and assigning a technician
    if (technicianId !== null) {
      const current = await db('interventions').where({ id }).select('status').first();
      if (current && current.status === 'pending') {
        updateData.status = 'assigned';
      }
    }

    const [row] = await db('interventions')
      .where({ id })
      .update(updateData)
      .returning('*');

    if (!row) return null;
    return this.getById(row.id);
  },

  async getSummary(tenantId: number): Promise<Record<InterventionStatus, number>> {
    const rows = await db('interventions')
      .where({ tenant_id: tenantId })
      .groupBy('status')
      .select('status')
      .count('* as count');

    const summary: Record<string, number> = {
      pending: 0,
      assigned: 0,
      in_progress: 0,
      done: 0,
      issue: 0,
      cancelled: 0,
    };

    for (const r of rows) {
      summary[r.status as string] = Number(r.count);
    }

    return summary as Record<InterventionStatus, number>;
  },

  async getScheduleForDay(tenantId: number, date: string): Promise<Intervention[]> {
    const rows = await interventionBaseQuery(tenantId)
      .whereRaw('DATE(interventions.scheduled_at) = ?', [date])
      .orderBy('interventions.scheduled_at', 'asc');

    return rows.map(rowToIntervention);
  },
};

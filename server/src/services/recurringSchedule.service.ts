import { db } from '../db';
import type { RecurringSchedule, RecurringFrequency } from '@oblifield/shared';

interface ScheduleRow {
  id: number;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  client_id: number | null;
  client_name: string | null;
  site_id: number | null;
  site_name: string | null;
  assigned_technician_id: number | null;
  assigned_technician_name: string | null;
  step_template_id: number | null;
  frequency: string;
  interval: number;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  time_of_day: string | null;
  estimated_duration_minutes: number | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  next_run_at: Date | null;
  last_run_at: Date | null;
  is_active: boolean;
  created_by: number | null;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

function baseQuery(tenantId?: number) {
  const q = db('recurring_schedules as rs')
    .leftJoin('clients as c', 'rs.client_id', 'c.id')
    .leftJoin('sites as s', 'rs.site_id', 's.id')
    .leftJoin('technicians as t', 'rs.assigned_technician_id', 't.id')
    .select(
      'rs.*',
      'c.name as client_name',
      's.name as site_name',
      db.raw("CONCAT(t.first_name, ' ', t.last_name) as assigned_technician_name"),
    );
  if (tenantId !== undefined) q.where('rs.tenant_id', tenantId);
  return q;
}

function rowToSchedule(row: ScheduleRow): RecurringSchedule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    clientId: row.client_id,
    clientName: row.client_name ?? null,
    siteId: row.site_id,
    siteName: row.site_name ?? null,
    assignedTechnicianId: row.assigned_technician_id,
    assignedTechnicianName: row.assigned_technician_name ?? null,
    stepTemplateId: row.step_template_id,
    frequency: row.frequency as RecurringFrequency,
    interval: row.interval,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    monthOfYear: row.month_of_year,
    timeOfDay: row.time_of_day,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    address: row.address,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    nextRunAt: row.next_run_at?.toISOString() ?? null,
    lastRunAt: row.last_run_at?.toISOString() ?? null,
    isActive: row.is_active,
    createdBy: row.created_by,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function computeNextRun(frequency: RecurringFrequency, interval: number, dayOfWeek: number | null, dayOfMonth: number | null, monthOfYear: number | null, timeOfDay: string | null, from?: Date): Date {
  const now = from ?? new Date();
  const next = new Date(now);
  const [hours, minutes] = (timeOfDay ?? '08:00').split(':').map(Number);
  next.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      if (dayOfWeek != null) {
        const diff = dayOfWeek - next.getDay();
        next.setDate(next.getDate() + (diff >= 0 ? diff : diff + 7));
      }
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      if (dayOfMonth != null) next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      if (monthOfYear != null) next.setMonth(monthOfYear - 1);
      if (dayOfMonth != null) next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      break;
  }

  return next;
}

export const recurringScheduleService = {
  async getAll(tenantId: number): Promise<RecurringSchedule[]> {
    const rows = await baseQuery(tenantId).orderBy('rs.title');
    return rows.map(rowToSchedule);
  },

  async getById(id: number): Promise<RecurringSchedule | null> {
    const row = await baseQuery().where('rs.id', id).first();
    return row ? rowToSchedule(row) : null;
  },

  async create(
    data: {
      title: string;
      description?: string | null;
      type?: string;
      priority?: string;
      clientId?: number | null;
      siteId?: number | null;
      assignedTechnicianId?: number | null;
      stepTemplateId?: number | null;
      frequency: RecurringFrequency;
      interval?: number;
      dayOfWeek?: number | null;
      dayOfMonth?: number | null;
      monthOfYear?: number | null;
      timeOfDay?: string | null;
      estimatedDurationMinutes?: number | null;
      address?: string | null;
      contactName?: string | null;
      contactPhone?: string | null;
    },
    tenantId: number,
    userId: number,
  ): Promise<RecurringSchedule> {
    const nextRun = computeNextRun(
      data.frequency, data.interval ?? 1,
      data.dayOfWeek ?? null, data.dayOfMonth ?? null,
      data.monthOfYear ?? null, data.timeOfDay ?? null,
    );

    const [row] = await db('recurring_schedules')
      .insert({
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'maintenance',
        priority: data.priority ?? 'normal',
        client_id: data.clientId ?? null,
        site_id: data.siteId ?? null,
        assigned_technician_id: data.assignedTechnicianId ?? null,
        step_template_id: data.stepTemplateId ?? null,
        frequency: data.frequency,
        interval: data.interval ?? 1,
        day_of_week: data.dayOfWeek ?? null,
        day_of_month: data.dayOfMonth ?? null,
        month_of_year: data.monthOfYear ?? null,
        time_of_day: data.timeOfDay ?? null,
        estimated_duration_minutes: data.estimatedDurationMinutes ?? null,
        address: data.address ?? null,
        contact_name: data.contactName ?? null,
        contact_phone: data.contactPhone ?? null,
        next_run_at: nextRun,
        is_active: true,
        created_by: userId,
        tenant_id: tenantId,
      })
      .returning('*');

    return (await this.getById(row.id))!;
  },

  async update(id: number, data: Partial<Record<string, unknown>>): Promise<RecurringSchedule | null> {
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    const fieldMap: Record<string, string> = {
      title: 'title', description: 'description', type: 'type', priority: 'priority',
      clientId: 'client_id', siteId: 'site_id', assignedTechnicianId: 'assigned_technician_id',
      stepTemplateId: 'step_template_id', frequency: 'frequency', interval: 'interval',
      dayOfWeek: 'day_of_week', dayOfMonth: 'day_of_month', monthOfYear: 'month_of_year',
      timeOfDay: 'time_of_day', estimatedDurationMinutes: 'estimated_duration_minutes',
      address: 'address', contactName: 'contact_name', contactPhone: 'contact_phone',
      isActive: 'is_active',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) updateData[col] = data[key];
    }

    // Recompute next_run_at if schedule params changed
    if (data.frequency || data.interval || data.dayOfWeek !== undefined || data.dayOfMonth !== undefined) {
      const current = await db('recurring_schedules').where({ id }).first();
      if (current) {
        const freq = (data.frequency ?? current.frequency) as RecurringFrequency;
        const intv = (data.interval ?? current.interval) as number;
        updateData.next_run_at = computeNextRun(
          freq, intv,
          (data.dayOfWeek ?? current.day_of_week) as number | null,
          (data.dayOfMonth ?? current.day_of_month) as number | null,
          (data.monthOfYear ?? current.month_of_year) as number | null,
          (data.timeOfDay ?? current.time_of_day) as string | null,
        );
      }
    }

    const [row] = await db('recurring_schedules').where({ id }).update(updateData).returning('*');
    if (!row) return null;
    return this.getById(row.id);
  },

  async delete(id: number): Promise<void> {
    await db('recurring_schedules').where({ id }).del();
  },

  // Called by cron: find schedules due and create interventions
  async processDueSchedules(): Promise<number> {
    const now = new Date();
    const dueSchedules = await db('recurring_schedules')
      .where('is_active', true)
      .where('next_run_at', '<=', now);

    let created = 0;
    for (const sched of dueSchedules) {
      const { interventionService } = await import('./intervention.service');
      const { interventionStepService } = await import('./interventionStep.service');

      const intervention = await interventionService.create({
        title: sched.title,
        description: sched.description,
        type: sched.type,
        priority: sched.priority,
        clientId: sched.client_id,
        siteId: sched.site_id,
        assignedTechnicianId: sched.assigned_technician_id,
        scheduledAt: sched.next_run_at?.toISOString() ?? null,
        estimatedDurationMinutes: sched.estimated_duration_minutes,
        address: sched.address,
        contactName: sched.contact_name,
        contactPhone: sched.contact_phone,
        stepTemplateId: sched.step_template_id,
      }, sched.tenant_id, sched.created_by ?? 0);

      // Also set recurring_schedule_id
      await db('interventions').where({ id: intervention.id }).update({ recurring_schedule_id: sched.id });

      // Instantiate steps from template if set
      if (sched.step_template_id) {
        await interventionStepService.instantiateFromTemplate(intervention.id, sched.step_template_id);
      }

      // Compute next run and update schedule
      const nextRun = computeNextRun(
        sched.frequency, sched.interval,
        sched.day_of_week, sched.day_of_month,
        sched.month_of_year, sched.time_of_day, now,
      );

      await db('recurring_schedules').where({ id: sched.id }).update({
        last_run_at: now,
        next_run_at: nextRun,
        updated_at: now,
      });

      created++;
    }

    return created;
  },
};

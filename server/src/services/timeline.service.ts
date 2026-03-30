import { db } from '../db';
import type { TimelineEvent, TimelineEventType, InterventionStatus } from '@oblifield/shared';

interface TimelineEventRow {
  id: number;
  intervention_id: number;
  type: string;
  technician_id: number | null;
  technician_name: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  message: string | null;
  photo_url: string | null;
  previous_status: string | null;
  new_status: string | null;
  created_at: Date;
}

function rowToTimelineEvent(row: TimelineEventRow): TimelineEvent {
  return {
    id: row.id,
    interventionId: row.intervention_id,
    type: row.type as TimelineEventType,
    technicianId: row.technician_id,
    technicianName: row.technician_name ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    message: row.message,
    photoUrl: row.photo_url,
    previousStatus: (row.previous_status as InterventionStatus) ?? null,
    newStatus: (row.new_status as InterventionStatus) ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

function timelineBaseQuery() {
  return db('timeline_events')
    .leftJoin('technicians as t', 'timeline_events.technician_id', 't.id')
    .leftJoin('users as u', 't.user_id', 'u.id')
    .select(
      'timeline_events.*',
      'u.display_name as technician_name',
    );
}

export const timelineService = {
  async getByIntervention(interventionId: number, limit?: number, offset?: number): Promise<TimelineEvent[]> {
    const q = timelineBaseQuery()
      .where('timeline_events.intervention_id', interventionId)
      .orderBy('timeline_events.created_at', 'desc');

    if (limit) q.limit(limit);
    if (offset) q.offset(offset);

    const rows = await q;
    return rows.map(rowToTimelineEvent);
  },

  async create(data: {
    interventionId: number;
    type: TimelineEventType;
    technicianId?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    message?: string | null;
    photoUrl?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
  }): Promise<TimelineEvent> {
    const [row] = await db('timeline_events')
      .insert({
        intervention_id: data.interventionId,
        type: data.type,
        technician_id: data.technicianId ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        accuracy: data.accuracy ?? null,
        message: data.message ?? null,
        photo_url: data.photoUrl ?? null,
        previous_status: data.previousStatus ?? null,
        new_status: data.newStatus ?? null,
      })
      .returning('*');

    // Re-fetch with joins to get technician name
    const fetched = await timelineBaseQuery()
      .where('timeline_events.id', row.id)
      .first();

    return rowToTimelineEvent(fetched);
  },

  async getRecent(tenantId: number, limit?: number): Promise<TimelineEvent[]> {
    const rows = await timelineBaseQuery()
      .join('interventions as i', 'timeline_events.intervention_id', 'i.id')
      .where('i.tenant_id', tenantId)
      .orderBy('timeline_events.created_at', 'desc')
      .limit(limit ?? 50);

    return rows.map(rowToTimelineEvent);
  },
};

import { db } from '../db';
import type { Technician, TechnicianStatus } from '@oblifield/shared';

interface TechnicianRow {
  id: number;
  user_id: number;
  username: string | null;
  display_name: string | null;
  status: string;
  current_intervention_id: number | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: Date | null;
  phone: string | null;
  specialties: string[] | string | null;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

function technicianBaseQuery(tenantId?: number) {
  const q = db('technicians')
    .leftJoin('users as u', 'technicians.user_id', 'u.id')
    .select(
      'technicians.*',
      'u.username',
      'u.display_name',
    );
  if (tenantId !== undefined) {
    q.where('technicians.tenant_id', tenantId);
  }
  return q;
}

function parseSpecialties(val: string[] | string | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

function rowToTechnician(row: TechnicianRow): Technician {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username ?? null,
    displayName: row.display_name ?? null,
    status: row.status as TechnicianStatus,
    currentInterventionId: row.current_intervention_id,
    lastLatitude: row.last_latitude,
    lastLongitude: row.last_longitude,
    lastLocationAt: row.last_location_at ? row.last_location_at.toISOString() : null,
    phone: row.phone,
    specialties: parseSpecialties(row.specialties),
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const technicianService = {
  async getAll(tenantId: number): Promise<Technician[]> {
    const rows = await technicianBaseQuery(tenantId).orderBy('u.display_name');
    return rows.map(rowToTechnician);
  },

  async getById(id: number): Promise<Technician | null> {
    const row = await technicianBaseQuery().where('technicians.id', id).first();
    return row ? rowToTechnician(row) : null;
  },

  async getByUserId(userId: number, tenantId: number): Promise<Technician | null> {
    const row = await technicianBaseQuery(tenantId)
      .where('technicians.user_id', userId)
      .first();
    return row ? rowToTechnician(row) : null;
  },

  async create(
    data: {
      userId: number;
      phone?: string | null;
      specialties?: string[];
    },
    tenantId: number,
  ): Promise<Technician> {
    const [row] = await db('technicians')
      .insert({
        user_id: data.userId,
        phone: data.phone ?? null,
        specialties: JSON.stringify(data.specialties ?? []),
        tenant_id: tenantId,
      })
      .returning('*');

    // Re-fetch with joins to get user info
    return (await this.getById(row.id))!;
  },

  async update(
    id: number,
    data: Partial<{ phone: string | null; specialties: string[] }>,
  ): Promise<Technician | null> {
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.specialties !== undefined) updateData.specialties = JSON.stringify(data.specialties);

    const [row] = await db('technicians')
      .where({ id })
      .update(updateData)
      .returning('*');

    if (!row) return null;
    return this.getById(row.id);
  },

  async delete(id: number): Promise<void> {
    await db('technicians').where({ id }).del();
  },

  async updateStatus(id: number, status: TechnicianStatus): Promise<Technician | null> {
    const [row] = await db('technicians')
      .where({ id })
      .update({ status, updated_at: new Date() })
      .returning('*');

    if (!row) return null;
    return this.getById(row.id);
  },

  async updateLocation(id: number, latitude: number, longitude: number): Promise<void> {
    await db('technicians')
      .where({ id })
      .update({
        last_latitude: latitude,
        last_longitude: longitude,
        last_location_at: new Date(),
        updated_at: new Date(),
      });
  },

  async getAvailable(tenantId: number): Promise<Technician[]> {
    const rows = await technicianBaseQuery(tenantId)
      .where('technicians.status', 'available')
      .orderBy('u.display_name');
    return rows.map(rowToTechnician);
  },
};

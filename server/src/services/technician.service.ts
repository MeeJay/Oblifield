import { db } from '../db';
import type { Technician, TechnicianStatus, TechnicianType } from '@oblifield/shared';

interface TechnicianRow {
  id: number;
  first_name: string;
  last_name: string;
  company: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  action_radius_km: number | null;
  type: string | null;
  type_other: string | null;
  rating: number | null;
  status: string;
  current_intervention_id: number | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: Date | null;
  specialties: string[] | string | null;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

function technicianBaseQuery(tenantId?: number) {
  const q = db('technicians').select('technicians.*');
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
  const firstName = row.first_name ?? '';
  const lastName = row.last_name ?? '';
  return {
    id: row.id,
    firstName,
    lastName,
    displayName: (firstName + ' ' + lastName).trim(),
    company: row.company,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    country: row.country,
    phone: row.phone,
    email: row.email,
    actionRadiusKm: row.action_radius_km,
    type: row.type as TechnicianType | null,
    typeOther: row.type_other,
    rating: row.rating != null ? Number(row.rating) : null,
    status: row.status as TechnicianStatus,
    currentInterventionId: row.current_intervention_id,
    lastLatitude: row.last_latitude,
    lastLongitude: row.last_longitude,
    lastLocationAt: row.last_location_at ? row.last_location_at.toISOString() : null,
    specialties: parseSpecialties(row.specialties),
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const technicianService = {
  async getAll(tenantId: number): Promise<Technician[]> {
    const rows = await technicianBaseQuery(tenantId).orderBy('technicians.first_name');
    return rows.map(rowToTechnician);
  },

  async getById(id: number): Promise<Technician | null> {
    const row = await technicianBaseQuery().where('technicians.id', id).first();
    return row ? rowToTechnician(row) : null;
  },

  async create(
    data: {
      firstName: string;
      lastName: string;
      company?: string | null;
      address?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country?: string | null;
      phone?: string | null;
      email?: string | null;
      actionRadiusKm?: number | null;
      type?: string | null;
      typeOther?: string | null;
      specialties?: string[];
    },
    tenantId: number,
  ): Promise<Technician> {
    const [row] = await db('technicians')
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        company: data.company ?? null,
        address: data.address ?? null,
        postal_code: data.postalCode ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        action_radius_km: data.actionRadiusKm ?? null,
        type: data.type ?? null,
        type_other: data.typeOther ?? null,
        specialties: JSON.stringify(data.specialties ?? []),
        tenant_id: tenantId,
      })
      .returning('*');

    return (await this.getById(row.id))!;
  },

  async update(
    id: number,
    data: Partial<{
      firstName: string;
      lastName: string;
      company: string | null;
      address: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
      phone: string | null;
      email: string | null;
      actionRadiusKm: number | null;
      type: string | null;
      typeOther: string | null;
      specialties: string[];
      rating: number | null;
      currentInterventionId: number | null;
    }>,
  ): Promise<Technician | null> {
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.postalCode !== undefined) updateData.postal_code = data.postalCode;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.actionRadiusKm !== undefined) updateData.action_radius_km = data.actionRadiusKm;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.typeOther !== undefined) updateData.type_other = data.typeOther;
    if (data.specialties !== undefined) updateData.specialties = JSON.stringify(data.specialties);
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.currentInterventionId !== undefined) updateData.current_intervention_id = data.currentInterventionId;

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
      .orderBy('technicians.first_name');
    return rows.map(rowToTechnician);
  },
};

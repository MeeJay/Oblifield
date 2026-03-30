import { db } from '../db';
import type { Site } from '@oblifield/shared';

interface SiteRow {
  id: number;
  client_id: number;
  client_name: string | null;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

function rowToSite(row: SiteRow): Site {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name ?? null,
    name: row.name,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    region: row.region,
    country: row.country,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function baseQuery(tenantId?: number) {
  const q = db('sites')
    .leftJoin('clients as c', 'sites.client_id', 'c.id')
    .select('sites.*', 'c.name as client_name');
  if (tenantId !== undefined) {
    q.where('sites.tenant_id', tenantId);
  }
  return q;
}

export const siteService = {
  async getAll(tenantId: number, filters?: { clientId?: number; country?: string }): Promise<Site[]> {
    const q = baseQuery(tenantId).orderBy('sites.name');
    if (filters?.clientId) q.where('sites.client_id', filters.clientId);
    if (filters?.country) q.where('sites.country', filters.country);
    const rows = await q;
    return rows.map(rowToSite);
  },

  async getById(id: number): Promise<Site | null> {
    const row = await baseQuery().where('sites.id', id).first();
    return row ? rowToSite(row) : null;
  },

  async create(
    data: {
      clientId: number;
      name: string;
      address?: string | null;
      city?: string | null;
      postalCode?: string | null;
      region?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      contactName?: string | null;
      contactPhone?: string | null;
      contactEmail?: string | null;
    },
    tenantId: number,
  ): Promise<Site> {
    const [row] = await db('sites')
      .insert({
        client_id: data.clientId,
        name: data.name,
        address: data.address ?? null,
        city: data.city ?? null,
        postal_code: data.postalCode ?? null,
        region: data.region ?? null,
        country: data.country ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        contact_name: data.contactName ?? null,
        contact_phone: data.contactPhone ?? null,
        contact_email: data.contactEmail ?? null,
        tenant_id: tenantId,
      })
      .returning('*');

    return (await this.getById(row.id))!;
  },

  async update(
    id: number,
    data: Partial<{
      clientId: number;
      name: string;
      address: string | null;
      city: string | null;
      postalCode: string | null;
      region: string | null;
      country: string | null;
      latitude: number | null;
      longitude: number | null;
      contactName: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
    }>,
  ): Promise<Site | null> {
    const existing = await db('sites').where({ id }).first();
    if (!existing) return null;

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.clientId !== undefined) updateData.client_id = data.clientId;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.postalCode !== undefined) updateData.postal_code = data.postalCode;
    if (data.region !== undefined) updateData.region = data.region;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.contactName !== undefined) updateData.contact_name = data.contactName;
    if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone;
    if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail;

    await db('sites').where({ id }).update(updateData);
    return this.getById(id);
  },

  async delete(id: number): Promise<void> {
    await db('sites').where({ id }).del();
  },

  async getByClient(clientId: number): Promise<Site[]> {
    const rows = await baseQuery().where('sites.client_id', clientId).orderBy('sites.name');
    return rows.map(rowToSite);
  },

  async getCountries(tenantId: number): Promise<string[]> {
    const rows = await db('sites')
      .where({ tenant_id: tenantId })
      .whereNotNull('country')
      .where('country', '!=', '')
      .distinct('country')
      .orderBy('country');
    return rows.map((r: any) => r.country);
  },
};

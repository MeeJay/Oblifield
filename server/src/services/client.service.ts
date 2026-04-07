import { db } from '../db';
import type { Client, ClientTreeNode } from '@oblifield/shared';

interface ClientRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  parent_id: number | null;
  sort_order: number;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureUniqueSlug(slug: string, tenantId: number, excludeId?: number): Promise<string> {
  let candidate = slug;
  let i = 1;
  while (true) {
    const q = db('clients').where({ slug: candidate, tenant_id: tenantId });
    if (excludeId) q.whereNot({ id: excludeId });
    const exists = await q.first();
    if (!exists) return candidate;
    candidate = `${slug}-${i++}`;
  }
}

export const clientService = {
  async getAll(tenantId: number): Promise<Client[]> {
    const rows = await db<ClientRow>('clients')
      .where({ tenant_id: tenantId })
      .orderBy('sort_order')
      .orderBy('name');
    return rows.map(rowToClient);
  },

  async getById(id: number): Promise<Client | null> {
    const row = await db<ClientRow>('clients').where({ id }).first();
    return row ? rowToClient(row) : null;
  },

  async getTree(tenantId: number): Promise<ClientTreeNode[]> {
    // Fetch all clients for tenant
    const allClients = await this.getAll(tenantId);

    // Fetch intervention counts per client
    const countRows = await db('interventions')
      .where({ tenant_id: tenantId })
      .whereNotNull('client_id')
      .groupBy('client_id')
      .select('client_id')
      .count('* as count');

    const countMap = new Map<number, number>();
    for (const r of countRows) {
      countMap.set(Number(r.client_id), Number(r.count));
    }

    // Fetch site counts per client
    const siteCountRows = await db('sites')
      .where({ tenant_id: tenantId })
      .groupBy('client_id')
      .select('client_id')
      .count('* as count');

    const siteCountMap = new Map<number, number>();
    for (const r of siteCountRows) {
      siteCountMap.set(Number(r.client_id), Number(r.count));
    }

    // Build tree
    const nodeMap = new Map<number, ClientTreeNode>();
    for (const c of allClients) {
      nodeMap.set(c.id, {
        ...c,
        children: [],
        interventionCount: countMap.get(c.id) ?? 0,
        siteCount: siteCountMap.get(c.id) ?? 0,
      });
    }

    const roots: ClientTreeNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  },

  async create(
    data: {
      name: string;
      description?: string | null;
      contactName?: string | null;
      contactPhone?: string | null;
      contactEmail?: string | null;
      parentId?: number | null;
      sortOrder?: number;
    },
    tenantId: number,
  ): Promise<Client> {
    const slug = await ensureUniqueSlug(slugify(data.name), tenantId);

    const [row] = await db<ClientRow>('clients')
      .insert({
        name: data.name,
        slug,
        description: data.description ?? null,
        contact_name: data.contactName ?? null,
        contact_phone: data.contactPhone ?? null,
        contact_email: data.contactEmail ?? null,
        parent_id: data.parentId ?? null,
        sort_order: data.sortOrder ?? 0,
        tenant_id: tenantId,
      })
      .returning('*');

    // Maintain closure table — self-reference (depth 0)
    await db('client_closure').insert({
      ancestor_id: row.id,
      descendant_id: row.id,
      depth: 0,
    });

    // Copy ancestor paths from parent
    if (data.parentId) {
      await db.raw(
        `INSERT INTO client_closure (ancestor_id, descendant_id, depth)
         SELECT gc.ancestor_id, ?, gc.depth + 1
         FROM client_closure gc
         WHERE gc.descendant_id = ?`,
        [row.id, data.parentId],
      );
    }

    return rowToClient(row);
  },

  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string | null;
      contactName: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
      parentId: number | null;
      sortOrder: number;
    }>,
  ): Promise<Client | null> {
    const existing = await db<ClientRow>('clients').where({ id }).first();
    if (!existing) return null;

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = await ensureUniqueSlug(slugify(data.name), existing.tenant_id, id);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.contactName !== undefined) updateData.contact_name = data.contactName;
    if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone;
    if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail;
    if (data.parentId !== undefined) updateData.parent_id = data.parentId;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    const [row] = await db<ClientRow>('clients')
      .where({ id })
      .update(updateData)
      .returning('*');

    return row ? rowToClient(row) : null;
  },

  async delete(id: number): Promise<void> {
    // CASCADE in the DB handles closure table cleanup
    await db('clients').where({ id }).del();
  },

  async getStats(
    tenantId: number,
  ): Promise<Record<number, { total: number; pending: number; inProgress: number; done: number }>> {
    const rows = await db('interventions')
      .where({ tenant_id: tenantId })
      .whereNotNull('client_id')
      .groupBy('client_id', 'status')
      .select('client_id', 'status')
      .count('* as count');

    const stats: Record<number, { total: number; pending: number; inProgress: number; done: number }> = {};

    for (const r of rows) {
      const clientId = r.client_id as number;
      if (!stats[clientId]) {
        stats[clientId] = { total: 0, pending: 0, inProgress: 0, done: 0 };
      }
      const cnt = Number(r.count);
      stats[clientId].total += cnt;
      if (r.status === 'pending') stats[clientId].pending += cnt;
      else if (r.status === 'in_progress' || r.status === 'paused') stats[clientId].inProgress += cnt;
      else if (r.status === 'pending_validation' || r.status === 'closed') stats[clientId].done += cnt;
    }

    return stats;
  },
};

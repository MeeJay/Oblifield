import { db } from '../db';
import type { DocDocument } from '@oblifield/shared';

interface DocumentRow {
  id: number;
  title: string;
  slug: string;
  content: string;
  category_id: number;
  category_name: string | null;
  sort_order: number;
  created_by: number | null;
  created_by_name: string | null;
  updated_by: number | null;
  updated_by_name: string | null;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

function documentBaseQuery(tenantId?: number) {
  const q = db('documents')
    .leftJoin('doc_categories as dc', 'documents.category_id', 'dc.id')
    .leftJoin('users as cu', 'documents.created_by', 'cu.id')
    .leftJoin('users as uu', 'documents.updated_by', 'uu.id')
    .select(
      'documents.*',
      'dc.name as category_name',
      'cu.display_name as created_by_name',
      'uu.display_name as updated_by_name',
    );
  if (tenantId !== undefined) {
    q.where('documents.tenant_id', tenantId);
  }
  return q;
}

function rowToDocument(row: DocumentRow): DocDocument {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdByName: row.created_by_name ?? null,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by_name ?? null,
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
    const q = db('documents').where({ slug: candidate, tenant_id: tenantId });
    if (excludeId) q.whereNot({ id: excludeId });
    const exists = await q.first();
    if (!exists) return candidate;
    candidate = `${slug}-${i++}`;
  }
}

export const documentService = {
  async getAll(
    tenantId: number,
    filters?: { categoryId?: number; search?: string },
  ): Promise<DocDocument[]> {
    const q = documentBaseQuery(tenantId).orderBy('documents.sort_order').orderBy('documents.title');

    if (filters?.categoryId) {
      // Include documents from category and all descendants
      const descendantIds = await db('doc_category_closure')
        .where({ ancestor_id: filters.categoryId })
        .select('descendant_id');
      q.whereIn('documents.category_id', descendantIds.map((r: any) => r.descendant_id));
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      q.where(function () {
        this.whereILike('documents.title', term).orWhereILike('documents.content', term);
      });
    }

    const rows = await q;
    return rows.map(rowToDocument);
  },

  async getById(id: number): Promise<DocDocument | null> {
    const row = await documentBaseQuery().where('documents.id', id).first();
    return row ? rowToDocument(row) : null;
  },

  async create(
    data: { title: string; content?: string; categoryId: number; sortOrder?: number },
    tenantId: number,
    userId: number,
  ): Promise<DocDocument> {
    const slug = await ensureUniqueSlug(slugify(data.title), tenantId);

    const [row] = await db('documents')
      .insert({
        title: data.title,
        slug,
        content: data.content ?? '',
        category_id: data.categoryId,
        sort_order: data.sortOrder ?? 0,
        created_by: userId,
        updated_by: userId,
        tenant_id: tenantId,
      })
      .returning('*');

    return (await this.getById(row.id))!;
  },

  async update(
    id: number,
    data: Partial<{ title: string; content: string; categoryId: number; sortOrder: number }>,
    userId: number,
  ): Promise<DocDocument | null> {
    const updateData: Record<string, unknown> = { updated_at: new Date(), updated_by: userId };
    if (data.title !== undefined) {
      updateData.title = data.title;
      const current = await db('documents').where({ id }).select('tenant_id').first();
      if (current) {
        updateData.slug = await ensureUniqueSlug(slugify(data.title), current.tenant_id, id);
      }
    }
    if (data.content !== undefined) updateData.content = data.content;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    const [row] = await db('documents')
      .where({ id })
      .update(updateData)
      .returning('*');

    if (!row) return null;
    return this.getById(row.id);
  },

  async delete(id: number): Promise<void> {
    await db('documents').where({ id }).del();
  },
};

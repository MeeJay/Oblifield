import { db } from '../db';
import type { DocCategory, DocCategoryTreeNode } from '@oblifield/shared';

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  sort_order: number;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

function rowToCategory(row: CategoryRow): DocCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
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
    const q = db('doc_categories').where({ slug: candidate, tenant_id: tenantId });
    if (excludeId) q.whereNot({ id: excludeId });
    const exists = await q.first();
    if (!exists) return candidate;
    candidate = `${slug}-${i++}`;
  }
}

export const docCategoryService = {
  async getAll(tenantId: number): Promise<DocCategory[]> {
    const rows = await db<CategoryRow>('doc_categories')
      .where({ tenant_id: tenantId })
      .orderBy('sort_order')
      .orderBy('name');
    return rows.map(rowToCategory);
  },

  async getById(id: number): Promise<DocCategory | null> {
    const row = await db<CategoryRow>('doc_categories').where({ id }).first();
    return row ? rowToCategory(row) : null;
  },

  async getTree(tenantId: number): Promise<DocCategoryTreeNode[]> {
    const allCats = await this.getAll(tenantId);

    const countRows = await db('documents')
      .where({ tenant_id: tenantId })
      .groupBy('category_id')
      .select('category_id')
      .count('* as count');

    const countMap = new Map<number, number>();
    for (const r of countRows) {
      countMap.set(Number(r.category_id), Number(r.count));
    }

    const nodeMap = new Map<number, DocCategoryTreeNode>();
    for (const c of allCats) {
      nodeMap.set(c.id, {
        ...c,
        children: [],
        documentCount: countMap.get(c.id) ?? 0,
      });
    }

    const roots: DocCategoryTreeNode[] = [];
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
    data: { name: string; description?: string | null; parentId?: number | null; sortOrder?: number },
    tenantId: number,
  ): Promise<DocCategory> {
    // Enforce max 3 levels of nesting
    if (data.parentId) {
      const depthRow = await db('doc_category_closure')
        .where({ descendant_id: data.parentId })
        .max('depth as max_depth')
        .first();
      if (depthRow && Number(depthRow.max_depth) >= 2) {
        throw new Error('Maximum nesting depth (3 levels) exceeded');
      }
    }

    const slug = await ensureUniqueSlug(slugify(data.name), tenantId);

    const [row] = await db<CategoryRow>('doc_categories')
      .insert({
        name: data.name,
        slug,
        description: data.description ?? null,
        parent_id: data.parentId ?? null,
        sort_order: data.sortOrder ?? 0,
        tenant_id: tenantId,
      })
      .returning('*');

    // Closure: self-reference
    await db('doc_category_closure').insert({
      ancestor_id: row.id,
      descendant_id: row.id,
      depth: 0,
    });

    // Closure: copy ancestor paths from parent
    if (data.parentId) {
      await db.raw(
        `INSERT INTO doc_category_closure (ancestor_id, descendant_id, depth)
         SELECT gc.ancestor_id, ?, gc.depth + 1
         FROM doc_category_closure gc
         WHERE gc.descendant_id = ?`,
        [row.id, data.parentId],
      );
    }

    return rowToCategory(row);
  },

  async update(
    id: number,
    data: Partial<{ name: string; description: string | null; parentId: number | null; sortOrder: number }>,
  ): Promise<DocCategory | null> {
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = await ensureUniqueSlug(slugify(data.name), 0, id);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    if (data.parentId !== undefined) {
      updateData.parent_id = data.parentId;
      // Rebuild closure: delete old paths (except self), re-insert from new parent
      await db('doc_category_closure')
        .where({ descendant_id: id })
        .whereNot({ ancestor_id: id })
        .del();

      if (data.parentId) {
        await db.raw(
          `INSERT INTO doc_category_closure (ancestor_id, descendant_id, depth)
           SELECT gc.ancestor_id, ?, gc.depth + 1
           FROM doc_category_closure gc
           WHERE gc.descendant_id = ?`,
          [id, data.parentId],
        );
      }
    }

    const [row] = await db<CategoryRow>('doc_categories')
      .where({ id })
      .update(updateData)
      .returning('*');

    return row ? rowToCategory(row) : null;
  },

  async delete(id: number): Promise<void> {
    await db('doc_categories').where({ id }).del();
  },

  async getDescendantIds(categoryId: number): Promise<number[]> {
    const rows = await db('doc_category_closure')
      .where({ ancestor_id: categoryId })
      .select('descendant_id');
    return rows.map((r: any) => r.descendant_id);
  },
};

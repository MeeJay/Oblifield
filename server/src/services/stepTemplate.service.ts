import { db } from '../db';
import type { StepTemplate, StepTemplateItem } from '@oblifield/shared';

interface TemplateRow {
  id: number;
  name: string;
  description: string | null;
  tenant_id: number;
  created_at: Date;
  updated_at: Date;
}

interface TemplateItemRow {
  id: number;
  template_id: number;
  sort_order: number;
  label: string;
  description: string | null;
  created_at: Date;
}

function rowToTemplate(row: TemplateRow, items: StepTemplateItem[] = []): StepTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    items,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function rowToItem(row: TemplateItemRow): StepTemplateItem {
  return {
    id: row.id,
    templateId: row.template_id,
    sortOrder: row.sort_order,
    label: row.label,
    description: row.description,
    createdAt: row.created_at.toISOString(),
  };
}

export const stepTemplateService = {
  async getAll(tenantId: number): Promise<StepTemplate[]> {
    const templates = await db('step_templates')
      .where({ tenant_id: tenantId })
      .orderBy('name');

    const ids = templates.map((t: TemplateRow) => t.id);
    const items = ids.length > 0
      ? await db('step_template_items')
          .whereIn('template_id', ids)
          .orderBy(['template_id', 'sort_order'])
      : [];

    const itemsByTemplate = new Map<number, StepTemplateItem[]>();
    for (const item of items) {
      const arr = itemsByTemplate.get(item.template_id) ?? [];
      arr.push(rowToItem(item));
      itemsByTemplate.set(item.template_id, arr);
    }

    return templates.map((t: TemplateRow) =>
      rowToTemplate(t, itemsByTemplate.get(t.id) ?? []),
    );
  },

  async getById(id: number): Promise<StepTemplate | null> {
    const row = await db('step_templates').where({ id }).first();
    if (!row) return null;

    const items = await db('step_template_items')
      .where({ template_id: id })
      .orderBy('sort_order');

    return rowToTemplate(row, items.map(rowToItem));
  },

  async create(
    data: { name: string; description?: string | null; items: Array<{ label: string; description?: string | null }> },
    tenantId: number,
  ): Promise<StepTemplate> {
    return db.transaction(async (trx) => {
      const [row] = await trx('step_templates')
        .insert({
          name: data.name,
          description: data.description ?? null,
          tenant_id: tenantId,
        })
        .returning('*');

      if (data.items.length > 0) {
        await trx('step_template_items').insert(
          data.items.map((item, i) => ({
            template_id: row.id,
            sort_order: i,
            label: item.label,
            description: item.description ?? null,
          })),
        );
      }

      return (await this.getById(row.id))!;
    });
  },

  async update(
    id: number,
    data: { name?: string; description?: string | null; items?: Array<{ label: string; description?: string | null }> },
  ): Promise<StepTemplate | null> {
    return db.transaction(async (trx) => {
      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;

      const [row] = await trx('step_templates')
        .where({ id })
        .update(updateData)
        .returning('*');

      if (!row) return null;

      if (data.items !== undefined) {
        await trx('step_template_items').where({ template_id: id }).del();
        if (data.items.length > 0) {
          await trx('step_template_items').insert(
            data.items.map((item, i) => ({
              template_id: id,
              sort_order: i,
              label: item.label,
              description: item.description ?? null,
            })),
          );
        }
      }

      return (await stepTemplateService.getById(id))!;
    });
  },

  async delete(id: number): Promise<void> {
    await db('step_templates').where({ id }).del();
  },
};

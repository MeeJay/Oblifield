import { db } from '../db';
import type { InterventionPart } from '@oblifield/shared';

interface PartRow {
  id: number;
  intervention_id: number;
  name: string;
  reference: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  notes: string | null;
  created_at: Date;
}

function rowToPart(row: PartRow): InterventionPart {
  return {
    id: row.id,
    interventionId: row.intervention_id,
    name: row.name,
    reference: row.reference ?? null,
    quantity: Number(row.quantity) || 1,
    unit: row.unit ?? null,
    unitPrice: row.unit_price ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export const interventionPartService = {
  async getByIntervention(interventionId: number): Promise<InterventionPart[]> {
    const rows = await db('intervention_parts')
      .where({ intervention_id: interventionId })
      .orderBy('created_at');

    return rows.map(rowToPart);
  },

  async create(data: {
    interventionId: number;
    name: string;
    reference?: string | null;
    quantity?: number | null;
    unit?: string | null;
    unitPrice?: number | null;
    notes?: string | null;
  }): Promise<InterventionPart> {
    const [row] = await db('intervention_parts')
      .insert({
        intervention_id: data.interventionId,
        name: data.name,
        reference: data.reference ?? null,
        quantity: data.quantity ?? null,
        unit: data.unit ?? null,
        unit_price: data.unitPrice ?? null,
        notes: data.notes ?? null,
      })
      .returning('*');

    return rowToPart(row);
  },

  async update(
    id: number,
    data: Partial<{
      name: string;
      reference: string | null;
      quantity: number | null;
      unit: string | null;
      unitPrice: number | null;
      notes: string | null;
    }>,
  ): Promise<InterventionPart | null> {
    const updatePayload: Record<string, unknown> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.reference !== undefined) updatePayload.reference = data.reference;
    if (data.quantity !== undefined) updatePayload.quantity = data.quantity;
    if (data.unit !== undefined) updatePayload.unit = data.unit;
    if (data.unitPrice !== undefined) updatePayload.unit_price = data.unitPrice;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    const [row] = await db('intervention_parts')
      .where({ id })
      .update(updatePayload)
      .returning('*');

    return row ? rowToPart(row) : null;
  },

  async delete(id: number): Promise<void> {
    await db('intervention_parts').where({ id }).del();
  },

  async getTotalCost(interventionId: number): Promise<number> {
    const result = await db('intervention_parts')
      .where({ intervention_id: interventionId })
      .select(db.raw('SUM(COALESCE(quantity, 0) * COALESCE(unit_price, 0)) as total'))
      .first();

    return parseFloat(result?.total) || 0;
  },
};

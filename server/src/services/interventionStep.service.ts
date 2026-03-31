import { db } from '../db';
import type { InterventionStep } from '@oblifield/shared';

interface StepRow {
  id: number;
  intervention_id: number;
  template_item_id: number | null;
  sort_order: number;
  label: string;
  description: string | null;
  technician_validated_at: Date | null;
  technician_validated_by: number | null;
  technician_name: string | null;
  supervisor_validated_at: Date | null;
  supervisor_validated_by: number | null;
  supervisor_name: string | null;
  created_at: Date;
}

function stepBaseQuery() {
  return db('intervention_steps')
    .leftJoin('technicians as t', 'intervention_steps.technician_validated_by', 't.id')
    .leftJoin('users as u', 'intervention_steps.supervisor_validated_by', 'u.id')
    .select(
      'intervention_steps.*',
      db.raw("CONCAT(t.first_name, ' ', t.last_name) as technician_name"),
      'u.display_name as supervisor_name',
    );
}

function rowToStep(row: StepRow): InterventionStep {
  return {
    id: row.id,
    interventionId: row.intervention_id,
    templateItemId: row.template_item_id,
    sortOrder: row.sort_order,
    label: row.label,
    description: row.description,
    technicianValidatedAt: row.technician_validated_at?.toISOString() ?? null,
    technicianValidatedBy: row.technician_validated_by,
    technicianValidatedByName: row.technician_name ?? null,
    supervisorValidatedAt: row.supervisor_validated_at?.toISOString() ?? null,
    supervisorValidatedBy: row.supervisor_validated_by,
    supervisorValidatedByName: row.supervisor_name ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export const interventionStepService = {
  async getByIntervention(interventionId: number): Promise<InterventionStep[]> {
    const rows = await stepBaseQuery()
      .where('intervention_steps.intervention_id', interventionId)
      .orderBy('intervention_steps.sort_order');
    return rows.map(rowToStep);
  },

  async instantiateFromTemplate(interventionId: number, templateId: number): Promise<InterventionStep[]> {
    return db.transaction(async (trx) => {
      // Delete existing steps
      await trx('intervention_steps').where({ intervention_id: interventionId }).del();

      // Fetch template items
      const items = await trx('step_template_items')
        .where({ template_id: templateId })
        .orderBy('sort_order');

      if (items.length > 0) {
        await trx('intervention_steps').insert(
          items.map((item: any) => ({
            intervention_id: interventionId,
            template_item_id: item.id,
            sort_order: item.sort_order,
            label: item.label,
            description: item.description,
          })),
        );
      }

      // Update intervention's step_template_id
      await trx('interventions')
        .where({ id: interventionId })
        .update({ step_template_id: templateId, updated_at: new Date() });

      return this.getByIntervention(interventionId);
    });
  },

  async validateTechnician(stepId: number, technicianId: number): Promise<InterventionStep | null> {
    const [row] = await db('intervention_steps')
      .where({ id: stepId })
      .update({
        technician_validated_at: new Date(),
        technician_validated_by: technicianId,
      })
      .returning('*');
    if (!row) return null;
    const fetched = await stepBaseQuery().where('intervention_steps.id', row.id).first();
    return fetched ? rowToStep(fetched) : null;
  },

  async unvalidateTechnician(stepId: number): Promise<InterventionStep | null> {
    const [row] = await db('intervention_steps')
      .where({ id: stepId })
      .update({
        technician_validated_at: null,
        technician_validated_by: null,
      })
      .returning('*');
    if (!row) return null;
    const fetched = await stepBaseQuery().where('intervention_steps.id', row.id).first();
    return fetched ? rowToStep(fetched) : null;
  },

  async validateSupervisor(stepId: number, userId: number): Promise<InterventionStep | null> {
    const [row] = await db('intervention_steps')
      .where({ id: stepId })
      .update({
        supervisor_validated_at: new Date(),
        supervisor_validated_by: userId,
      })
      .returning('*');
    if (!row) return null;
    const fetched = await stepBaseQuery().where('intervention_steps.id', row.id).first();
    return fetched ? rowToStep(fetched) : null;
  },

  async unvalidateSupervisor(stepId: number): Promise<InterventionStep | null> {
    const [row] = await db('intervention_steps')
      .where({ id: stepId })
      .update({
        supervisor_validated_at: null,
        supervisor_validated_by: null,
      })
      .returning('*');
    if (!row) return null;
    const fetched = await stepBaseQuery().where('intervention_steps.id', row.id).first();
    return fetched ? rowToStep(fetched) : null;
  },
};

import { db } from '../db';
import type { InterventionDocument } from '@oblifield/shared';

interface JunctionRow {
  intervention_id: number;
  document_id: number;
  document_title: string;
  category_name: string | null;
  attached_by: number | null;
  attached_at: Date;
}

function rowToInterventionDocument(row: JunctionRow): InterventionDocument {
  return {
    interventionId: row.intervention_id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    categoryName: row.category_name ?? null,
    attachedBy: row.attached_by,
    attachedAt: row.attached_at.toISOString(),
  };
}

export const interventionDocumentService = {
  async getByIntervention(interventionId: number): Promise<InterventionDocument[]> {
    const rows = await db('intervention_documents as id')
      .join('documents as d', 'id.document_id', 'd.id')
      .leftJoin('doc_categories as dc', 'd.category_id', 'dc.id')
      .where('id.intervention_id', interventionId)
      .select(
        'id.intervention_id',
        'id.document_id',
        'd.title as document_title',
        'dc.name as category_name',
        'id.attached_by',
        'id.attached_at',
      )
      .orderBy('id.attached_at', 'desc');

    return rows.map(rowToInterventionDocument);
  },

  async attach(interventionId: number, documentId: number, userId: number | null): Promise<void> {
    await db('intervention_documents')
      .insert({
        intervention_id: interventionId,
        document_id: documentId,
        attached_by: userId,
      })
      .onConflict(['intervention_id', 'document_id'])
      .ignore();
  },

  async detach(interventionId: number, documentId: number): Promise<void> {
    await db('intervention_documents')
      .where({ intervention_id: interventionId, document_id: documentId })
      .del();
  },
};

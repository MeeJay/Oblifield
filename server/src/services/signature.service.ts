import { db } from '../db';
import type { InterventionSignature } from '@oblifield/shared';

interface SignatureRow {
  id: number;
  intervention_id: number;
  type: string;
  signature_data: string;
  signer_name: string | null;
  signed_by_user_id: number | null;
  signed_by_technician_id: number | null;
  signed_at: Date;
}

function rowToSignature(row: SignatureRow): InterventionSignature {
  return {
    id: row.id,
    interventionId: row.intervention_id,
    type: row.type as 'technician' | 'supervisor',
    signatureData: row.signature_data,
    signerName: row.signer_name ?? '',
    signedByUserId: row.signed_by_user_id,
    signedByTechnicianId: row.signed_by_technician_id,
    signedAt: row.signed_at.toISOString(),
  };
}

export const signatureService = {
  async getByIntervention(interventionId: number): Promise<InterventionSignature[]> {
    const rows = await db('intervention_signatures')
      .where({ intervention_id: interventionId })
      .orderBy('signed_at');

    return rows.map(rowToSignature);
  },

  async save(data: {
    interventionId: number;
    type: 'technician' | 'supervisor';
    signatureData: string;
    signerName: string | null;
    signedByUserId?: number | null;
    signedByTechnicianId?: number | null;
  }): Promise<InterventionSignature> {
    const [row] = await db('intervention_signatures')
      .insert({
        intervention_id: data.interventionId,
        type: data.type,
        signature_data: data.signatureData,
        signer_name: data.signerName ?? null,
        signed_by_user_id: data.signedByUserId ?? null,
        signed_by_technician_id: data.signedByTechnicianId ?? null,
        signed_at: new Date(),
      })
      .onConflict(['intervention_id', 'type'])
      .merge({
        signature_data: data.signatureData,
        signer_name: data.signerName ?? null,
        signed_by_user_id: data.signedByUserId ?? null,
        signed_by_technician_id: data.signedByTechnicianId ?? null,
        signed_at: new Date(),
      })
      .returning('*');

    return rowToSignature(row);
  },

  async delete(id: number): Promise<void> {
    await db('intervention_signatures').where({ id }).del();
  },
};

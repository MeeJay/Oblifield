import { db } from '../db';
import type { InterventionPhoto } from '@oblifield/shared';
import path from 'path';
import fs from 'fs';

interface PhotoRow {
  id: number;
  intervention_id: number;
  timeline_event_id: number | null;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number | null;
  created_at: Date;
}

function rowToPhoto(row: PhotoRow): InterventionPhoto {
  return {
    id: row.id,
    interventionId: row.intervention_id,
    timelineEventId: row.timeline_event_id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at.toISOString(),
  };
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'photos');

export const photoService = {
  async getByIntervention(interventionId: number): Promise<InterventionPhoto[]> {
    const rows = await db<PhotoRow>('intervention_photos')
      .where({ intervention_id: interventionId })
      .orderBy('created_at', 'desc');
    return rows.map(rowToPhoto);
  },

  async save(file: Express.Multer.File, interventionId: number, userId: number | null, timelineEventId?: number | null): Promise<InterventionPhoto> {
    const [row] = await db<PhotoRow>('intervention_photos')
      .insert({
        intervention_id: interventionId,
        timeline_event_id: timelineEventId ?? null,
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        uploaded_by: userId,
      })
      .returning('*');
    return rowToPhoto(row);
  },

  async deleteById(id: number): Promise<void> {
    const row = await db<PhotoRow>('intervention_photos').where({ id }).first();
    if (row) {
      // Delete file from disk
      const filePath = path.join(UPLOAD_DIR, row.filename);
      try { fs.unlinkSync(filePath); } catch { /* file may not exist */ }
      await db('intervention_photos').where({ id }).del();
    }
  },
};

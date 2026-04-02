import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { SOCKET_EVENTS } from '@oblifield/shared';
import { interventionService } from '../services/intervention.service';
import { timelineService } from '../services/timeline.service';
import { interventionStepService } from '../services/interventionStep.service';
import { appConfigService } from '../services/appConfig.service';

const router = Router();

// ── Rate limiter for lookup ─────────────────────────────────────────────────
const lookupLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { success: false, error: 'Trop de tentatives. Reessayez dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Middleware: resolve intervention by UID + verify date ────────────────────
async function resolveIntervention(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.params.uid?.toUpperCase();
    if (!uid) return res.status(400).json({ success: false, error: 'UID is required' });

    const intervention = await interventionService.getByUid(uid);
    if (!intervention) return res.status(404).json({ success: false, error: 'Intervention not found' });

    // Verify date from header
    const techDate = req.headers['x-tech-date'] as string | undefined;
    if (!techDate) return res.status(400).json({ success: false, error: 'X-Tech-Date header is required' });

    const scheduled = intervention.scheduledAt || intervention.dueAt || intervention.createdAt;
    const scheduledDay = scheduled.substring(0, 10); // YYYY-MM-DD
    const providedDay = techDate.substring(0, 10);

    if (scheduledDay !== providedDay) {
      return res.status(403).json({ success: false, error: 'Date does not match' });
    }

    (req as any).intervention = intervention;
    next();
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ── POST /tech-panel/lookup ─────────────────────────────────────────────────
router.post('/lookup', lookupLimiter, async (req, res) => {
  try {
    const { uid, date } = req.body;
    if (!uid || !date) {
      return res.status(400).json({ success: false, error: 'uid and date are required' });
    }

    const intervention = await interventionService.getByUid(uid.toUpperCase());
    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // Verify date matches
    const scheduled = intervention.scheduledAt || intervention.dueAt || intervention.createdAt;
    const scheduledDay = scheduled.substring(0, 10);
    const providedDay = date.substring(0, 10);

    if (scheduledDay !== providedDay) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // Get logo URL
    const logoPath = await appConfigService.get('company_logo_path');
    let logoUrl: string | null = null;
    if (logoPath) {
      const filename = logoPath.split('/').pop();
      if (filename) logoUrl = `/api/tech-panel/logo`;
    }

    res.json({
      success: true,
      data: {
        uid: intervention.uid,
        title: intervention.title,
        status: intervention.status,
        clientName: intervention.clientName,
        siteName: intervention.siteName,
        logoUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /tech-panel/logo ────────────────────────────────────────────────────
router.get('/logo', async (_req, res) => {
  try {
    const logoPath = await appConfigService.get('company_logo_path');
    if (!logoPath || !fs.existsSync(logoPath)) {
      return res.status(404).json({ success: false, error: 'No logo configured' });
    }
    res.sendFile(path.resolve(logoPath));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── All routes below require UID + date verification ────────────────────────
router.use('/:uid', resolveIntervention as any);

// ── GET /tech-panel/:uid/details ────────────────────────────────────────────
router.get('/:uid/details', async (req, res) => {
  try {
    const intervention = (req as any).intervention;
    const { photoService } = await import('../services/photo.service');
    const { signatureService } = await import('../services/signature.service');

    const [steps, photos, signatures, timeline] = await Promise.all([
      interventionStepService.getByIntervention(intervention.id),
      photoService.getByIntervention(intervention.id),
      signatureService.getByIntervention(intervention.id),
      timelineService.getByIntervention(intervention.id, 100),
    ]);

    res.json({
      success: true,
      data: {
        intervention,
        steps,
        photos,
        signatures,
        timeline,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /tech-panel/:uid/check-in ─────────────────────────────────────────
router.post('/:uid/check-in', async (req, res) => {
  try {
    const intervention = (req as any).intervention;
    const { latitude, longitude, accuracy } = req.body;

    await timelineService.create({
      interventionId: intervention.id,
      technicianId: intervention.assignedTechnicianId,
      type: 'check_in',
      message: null,
      latitude,
      longitude,
      accuracy,
    });

    const updated = await interventionService.changeStatus(intervention.id, 'in_progress');

    if (intervention.assignedTechnicianId) {
      const { technicianService } = await import('../services/technician.service');
      await technicianService.updateStatus(intervention.assignedTechnicianId, 'on_site');
      await technicianService.update(intervention.assignedTechnicianId, {
        currentInterventionId: intervention.id,
      });
    }

    res.json({ success: true, data: updated });

    // Socket notifications
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${intervention.tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE, { intervention: updated });
      io.to(`tenant:${intervention.tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: updated });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /tech-panel/:uid/check-out ─────────────────────────────────────────
router.post('/:uid/check-out', async (req, res) => {
  try {
    const intervention = (req as any).intervention;
    const { latitude, longitude, accuracy, status } = req.body;
    const finalStatus = status === 'issue' ? 'issue' : 'done';

    await timelineService.create({
      interventionId: intervention.id,
      technicianId: intervention.assignedTechnicianId,
      type: 'check_out',
      message: null,
      latitude,
      longitude,
      accuracy,
    });

    const updated = await interventionService.changeStatus(intervention.id, finalStatus);

    if (intervention.assignedTechnicianId) {
      const { technicianService } = await import('../services/technician.service');
      await technicianService.updateStatus(intervention.assignedTechnicianId, 'available');
      await technicianService.update(intervention.assignedTechnicianId, {
        currentInterventionId: null,
      });
    }

    res.json({ success: true, data: updated });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${intervention.tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE, { intervention: updated });
      io.to(`tenant:${intervention.tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: updated });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /tech-panel/:uid/observations ───────────────────────────────────────
router.put('/:uid/observations', async (req, res) => {
  try {
    const intervention = (req as any).intervention;
    const { technicianObservations } = req.body;

    const updated = await interventionService.update(intervention.id, { technicianObservations });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /tech-panel/:uid/photos ────────────────────────────────────────────
router.post('/:uid/photos', async (req, res) => {
  try {
    const { photoUpload } = await import('../middleware/upload');
    const intervention = (req as any).intervention;

    photoUpload.single('photo')(req, res, async (uploadErr) => {
      if (uploadErr) return res.status(400).json({ success: false, error: uploadErr.message });
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const { photoService } = await import('../services/photo.service');

      const event = await timelineService.create({
        interventionId: intervention.id,
        type: 'photo',
        technicianId: intervention.assignedTechnicianId,
        message: req.file.originalname,
        photoUrl: `/uploads/photos/${req.file.filename}`,
      });

      const photo = await photoService.save(req.file, intervention.id, null, event.id);
      res.status(201).json({ success: true, data: photo });

      const io = req.app.get('io');
      if (io) {
        io.to(`tenant:${intervention.tenantId}`).emit(SOCKET_EVENTS.TIMELINE_EVENT_CREATED, {
          interventionId: intervention.id,
          event,
        });
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /tech-panel/:uid/photos/:filename ───────────────────────────────────
router.get('/:uid/photos/:filename', async (req, res) => {
  try {
    const filePath = path.resolve('/app/uploads/photos', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /tech-panel/:uid/signatures ────────────────────────────────────────
router.post('/:uid/signatures', async (req, res) => {
  try {
    const intervention = (req as any).intervention;
    const { signatureService } = await import('../services/signature.service');
    const { type, signatureData, signerName } = req.body;

    if (!type || !signatureData || !signerName) {
      return res.status(400).json({ success: false, error: 'type, signatureData, and signerName are required' });
    }
    if (type !== 'technician' && type !== 'client') {
      return res.status(400).json({ success: false, error: 'Only technician and client signatures are allowed' });
    }

    const data = await signatureService.save({
      interventionId: intervention.id,
      type,
      signatureData,
      signerName,
      signedByUserId: null,
      signedByTechnicianId: intervention.assignedTechnicianId,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /tech-panel/:uid/steps ──────────────────────────────────────────────
router.get('/:uid/steps', async (req, res) => {
  try {
    const intervention = (req as any).intervention;
    const data = await interventionStepService.getByIntervention(intervention.id);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /tech-panel/:uid/steps/:stepId/validate ────────────────────────────
router.post('/:uid/steps/:stepId/validate', async (req, res) => {
  try {
    const intervention = (req as any).intervention;
    const techId = intervention.assignedTechnicianId;
    if (!techId) return res.status(400).json({ success: false, error: 'No technician assigned' });

    const data = await interventionStepService.validateTechnician(Number(req.params.stepId), techId);
    if (!data) return res.status(404).json({ success: false, error: 'Step not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /tech-panel/:uid/steps/:stepId/unvalidate ──────────────────────────
router.post('/:uid/steps/:stepId/unvalidate', async (req, res) => {
  try {
    const data = await interventionStepService.unvalidateTechnician(Number(req.params.stepId));
    if (!data) return res.status(404).json({ success: false, error: 'Step not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

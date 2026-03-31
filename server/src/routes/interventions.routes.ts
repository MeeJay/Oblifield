import { Router } from 'express';
import { SOCKET_EVENTS } from '@oblifield/shared';
import { interventionService } from '../services/intervention.service';
import { timelineService } from '../services/timeline.service';
import { interventionStepService } from '../services/interventionStep.service';
import { interventionDocumentService } from '../services/interventionDocument.service';

const router = Router();

// GET /interventions — list with optional filters
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status, technicianId, clientId } = req.query;
    const filters: Record<string, any> = {};
    if (status) filters.status = status as string;
    if (technicianId) filters.technicianId = Number(technicianId);
    if (clientId) filters.clientId = Number(clientId);

    const data = await interventionService.getAll(tenantId, filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/summary — counts by status for dashboard
router.get('/summary', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await interventionService.getSummary(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/schedule — today's scheduled interventions
router.get('/schedule', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const data = await interventionService.getScheduleForDay(tenantId, date);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/schedule-range — interventions in a date range
router.get('/schedule-range', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'from and to query params required' });
    }
    const data = await interventionService.getScheduleForRange(tenantId, from as string, to as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/:id — detail
router.get('/:id', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await interventionService.getById(Number(req.params.id));
    if (!data) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions — create
router.post('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.session?.userId ?? 0;
    const {
      title, type, priority, clientId, siteId,
      assignedTechnicianId, scheduledAt, dueAt,
      address, latitude, longitude,
      contactName, contactPhone, contactEmail,
      estimatedDurationMinutes, description,
      supervisorId, technicianObservations, supervisorObservations,
      stepTemplateId,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const data = await interventionService.create({
      title, type, priority, clientId, siteId,
      assignedTechnicianId, scheduledAt, dueAt,
      address, latitude, longitude,
      contactName, contactPhone, contactEmail,
      estimatedDurationMinutes, description,
      supervisorId, technicianObservations, supervisorObservations,
      stepTemplateId,
    }, tenantId, userId);

    // Instantiate steps from template if provided
    if (stepTemplateId) {
      await interventionStepService.instantiateFromTemplate(data.id, stepTemplateId);
    }

    res.status(201).json({ success: true, data });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_CREATED, { intervention: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /interventions/:id — update
router.put('/:id', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await interventionService.update(Number(req.params.id), req.body);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }
    res.json({ success: true, data });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /interventions/:id — delete
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const interventionId = Number(req.params.id);
    await interventionService.delete(interventionId);
    res.json({ success: true, data: null });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_DELETED, { interventionId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/assign — assign technician
router.post('/:id/assign', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { technicianId } = req.body;
    if (!technicianId) {
      return res.status(400).json({ success: false, error: 'technicianId is required' });
    }
    const data = await interventionService.assign(Number(req.params.id), technicianId);
    res.json({ success: true, data });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/status — change status
router.post('/:id/status', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }
    const data = await interventionService.changeStatus(Number(req.params.id), status);
    res.json({ success: true, data });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE, { intervention: data });
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: data });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/:id/timeline — get timeline events
router.get('/:id/timeline', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const data = await timelineService.getByIntervention(Number(req.params.id), limit, offset);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/timeline — add timeline event
router.post('/:id/timeline', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.session.userId;
    const { type, message, latitude, longitude, accuracy } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, error: 'type is required' });
    }
    const interventionId = Number(req.params.id);
    const data = await timelineService.create({
      interventionId,
      technicianId: userId,
      type,
      message,
      latitude,
      longitude,
      accuracy,
    });
    res.status(201).json({ success: true, data });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.TIMELINE_EVENT_CREATED, { interventionId, event: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/check-in — technician check-in
router.post('/:id/check-in', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.session.userId;
    const interventionId = Number(req.params.id);
    const { latitude, longitude, accuracy } = req.body;

    // 1. Create timeline event
    await timelineService.create({
      interventionId,
      technicianId: userId,
      type: 'check_in',
      message: null,
      latitude,
      longitude,
      accuracy,
    });

    // 2. Update intervention status to in_progress and set startedAt if null
    const intervention = await interventionService.getById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // Use changeStatus for the status change (it also sets started_at for in_progress)
    const updated = await interventionService.changeStatus(interventionId, 'in_progress');

    // 3. Update technician status
    if (intervention.assignedTechnicianId) {
      const { technicianService } = await import('../services/technician.service');
      await technicianService.updateStatus(intervention.assignedTechnicianId, 'on_site');
      await technicianService.update(intervention.assignedTechnicianId, {
        currentInterventionId: interventionId,
      });
    }

    // 4. Return updated intervention
    res.json({ success: true, data: updated });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE, { intervention: updated });
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: updated });
      if (intervention.assignedTechnicianId) {
        io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.TECHNICIAN_STATUS_CHANGED, { technicianId: intervention.assignedTechnicianId, status: 'on_site' });
      }
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/check-out — technician check-out
router.post('/:id/check-out', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.session.userId;
    const interventionId = Number(req.params.id);
    const { latitude, longitude, accuracy, status } = req.body;

    const finalStatus = status === 'issue' ? 'issue' : 'done';

    // 1. Create timeline event
    await timelineService.create({
      interventionId,
      technicianId: userId,
      type: 'check_out',
      message: null,
      latitude,
      longitude,
      accuracy,
    });

    // 2. Update intervention status and set completedAt
    const intervention = await interventionService.getById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // Use changeStatus for the status change (it also sets completed_at for 'done')
    const updated = await interventionService.changeStatus(interventionId, finalStatus);

    // 3. Update technician status
    if (intervention.assignedTechnicianId) {
      const { technicianService } = await import('../services/technician.service');
      await technicianService.updateStatus(intervention.assignedTechnicianId, 'available');
      await technicianService.update(intervention.assignedTechnicianId, {
        currentInterventionId: null,
      });
    }

    // 4. Return updated intervention
    res.json({ success: true, data: updated });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE, { intervention: updated });
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: updated });
      if (intervention.assignedTechnicianId) {
        io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.TECHNICIAN_STATUS_CHANGED, { technicianId: intervention.assignedTechnicianId, status: 'available' });
      }
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/:id/photos — list photos
router.get('/:id/photos', async (req, res) => {
  try {
    const { photoService } = await import('../services/photo.service');
    const data = await photoService.getByIntervention(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/photos — upload photo
router.post('/:id/photos', async (req, res) => {
  try {
    const { photoUpload } = await import('../middleware/upload');
    photoUpload.single('photo')(req, res, async (uploadErr) => {
      if (uploadErr) {
        return res.status(400).json({ success: false, error: uploadErr.message });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      const tenantId = (req as any).tenantId;
      const userId = req.session?.userId ?? null;
      const interventionId = Number(req.params.id);

      const { photoService } = await import('../services/photo.service');
      const { timelineService: tlService } = await import('../services/timeline.service');

      // Create timeline event for the photo
      const event = await tlService.create({
        interventionId,
        type: 'photo',
        technicianId: null,
        message: req.file.originalname,
        photoUrl: `/uploads/photos/${req.file.filename}`,
      });

      // Save photo record
      const photo = await photoService.save(req.file, interventionId, userId, event.id);

      const io = req.app.get('io');
      if (io) {
        io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.TIMELINE_EVENT_CREATED, { interventionId, event });
      }

      res.status(201).json({ success: true, data: photo });
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/:id/documents — list attached documents
router.get('/:id/documents', async (req, res) => {
  try {
    const data = await interventionDocumentService.getByIntervention(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/documents — attach a document
router.post('/:id/documents', async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ success: false, error: 'documentId is required' });
    const userId = req.session?.userId ?? null;
    await interventionDocumentService.attach(Number(req.params.id), documentId, userId);
    const data = await interventionDocumentService.getByIntervention(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /interventions/:id/documents/:docId — detach a document
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    await interventionDocumentService.detach(Number(req.params.id), Number(req.params.docId));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/:id/steps — list steps
router.get('/:id/steps', async (req, res) => {
  try {
    const data = await interventionStepService.getByIntervention(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/steps/instantiate — instantiate steps from template
router.post('/:id/steps/instantiate', async (req, res) => {
  try {
    const { templateId } = req.body;
    if (!templateId) return res.status(400).json({ success: false, error: 'templateId is required' });
    const data = await interventionStepService.instantiateFromTemplate(Number(req.params.id), templateId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/steps/:stepId/validate-technician
router.post('/:id/steps/:stepId/validate-technician', async (req, res) => {
  try {
    const { technicianId } = req.body;
    if (!technicianId) return res.status(400).json({ success: false, error: 'technicianId is required' });
    const data = await interventionStepService.validateTechnician(Number(req.params.stepId), technicianId);
    if (!data) return res.status(404).json({ success: false, error: 'Step not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /interventions/:id/steps/:stepId/validate-technician
router.delete('/:id/steps/:stepId/validate-technician', async (req, res) => {
  try {
    const data = await interventionStepService.unvalidateTechnician(Number(req.params.stepId));
    if (!data) return res.status(404).json({ success: false, error: 'Step not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/steps/:stepId/validate-supervisor
router.post('/:id/steps/:stepId/validate-supervisor', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });
    const data = await interventionStepService.validateSupervisor(Number(req.params.stepId), userId);
    if (!data) return res.status(404).json({ success: false, error: 'Step not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /interventions/:id/steps/:stepId/validate-supervisor
router.delete('/:id/steps/:stepId/validate-supervisor', async (req, res) => {
  try {
    const data = await interventionStepService.unvalidateSupervisor(Number(req.params.stepId));
    if (!data) return res.status(404).json({ success: false, error: 'Step not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Signatures ──────────────────────────────────────────────────────────────

// GET /interventions/:id/signatures
router.get('/:id/signatures', async (req, res) => {
  try {
    const { signatureService } = await import('../services/signature.service');
    const data = await signatureService.getByIntervention(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/signatures
router.post('/:id/signatures', async (req, res) => {
  try {
    const { signatureService } = await import('../services/signature.service');
    const { type, signatureData, signerName } = req.body;
    if (!type || !signatureData || !signerName) {
      return res.status(400).json({ success: false, error: 'type, signatureData, and signerName are required' });
    }
    const userId = req.session?.userId ?? null;
    const data = await signatureService.save({
      interventionId: Number(req.params.id),
      type,
      signatureData,
      signerName,
      signedByUserId: type === 'supervisor' ? userId : null,
      signedByTechnicianId: null,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /interventions/:id/signatures/:sigId
router.delete('/:id/signatures/:sigId', async (req, res) => {
  try {
    const { signatureService } = await import('../services/signature.service');
    await signatureService.delete(Number(req.params.sigId));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Parts / Materials ───────────────────────────────────────────────────────

// GET /interventions/:id/parts
router.get('/:id/parts', async (req, res) => {
  try {
    const { interventionPartService } = await import('../services/interventionPart.service');
    const data = await interventionPartService.getByIntervention(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/parts
router.post('/:id/parts', async (req, res) => {
  try {
    const { interventionPartService } = await import('../services/interventionPart.service');
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    const data = await interventionPartService.create({
      interventionId: Number(req.params.id),
      ...req.body,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /interventions/:id/parts/:partId
router.put('/:id/parts/:partId', async (req, res) => {
  try {
    const { interventionPartService } = await import('../services/interventionPart.service');
    const data = await interventionPartService.update(Number(req.params.partId), req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Part not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /interventions/:id/parts/:partId
router.delete('/:id/parts/:partId', async (req, res) => {
  try {
    const { interventionPartService } = await import('../services/interventionPart.service');
    await interventionPartService.delete(Number(req.params.partId));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /interventions/:id/report/pdf — generate PDF report
router.get('/:id/report/pdf', async (req, res) => {
  try {
    const interventionId = Number(req.params.id);
    const intervention = await interventionService.getById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    const timeline = await timelineService.getByIntervention(interventionId, 500);
    const { photoService } = await import('../services/photo.service');
    const photos = await photoService.getByIntervention(interventionId);

    const { appConfigService } = await import('../services/appConfig.service');
    const { generateInterventionPdf } = await import('../services/pdfReport.service');

    const companyName = await appConfigService.get('company_name') || 'Oblifield';

    const doc = generateInterventionPdf({
      intervention,
      timeline,
      photos,
      companyName,
      supervisorName: (req.query.supervisor as string) || intervention.supervisorName || undefined,
    });

    const safeTitle = intervention.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    const filename = `rapport-${safeTitle}-${intervention.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

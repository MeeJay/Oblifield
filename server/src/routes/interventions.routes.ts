import { Router } from 'express';
import { SOCKET_EVENTS } from '@oblifield/shared';
import { db } from '../db';
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

// PUT /interventions/:id/geocode — set coordinates from client-side geocoding
router.put('/:id/geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: 'latitude and longitude are required' });
    }
    const data = await interventionService.update(Number(req.params.id), { latitude, longitude });
    if (!data) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }
    res.json({ success: true, data });
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

    // Fire-and-forget assignment email
    import('../services/interventionEmail.service').then((m) => m.interventionEmailService.sendAssignmentEmail(Number(req.params.id))).catch(() => {});
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

// DELETE /interventions/:id/timeline/:eventId — admin delete timeline event
router.delete('/:id/timeline/:eventId', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const interventionId = Number(req.params.id);
    const eventId = Number(req.params.eventId);
    await timelineService.delete(eventId);
    res.json({ success: true, data: null });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.TIMELINE_EVENT_CREATED, { interventionId });
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
    const { latitude, longitude, accuracy, customTimestamp } = req.body;

    // 1. Load intervention first to get assignedTechnicianId
    const intervention = await interventionService.getById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // 2. Create timeline event (use assigned technician, not the logged-in admin)
    await timelineService.create({
      interventionId,
      technicianId: intervention.assignedTechnicianId ?? null,
      type: 'check_in',
      message: customTimestamp ? `Pointage manuel : ${customTimestamp.replace('T', ' ').slice(0, 16)}` : null,
      latitude: latitude ?? intervention.latitude ?? null,
      longitude: longitude ?? intervention.longitude ?? null,
      accuracy: accuracy ?? null,
      createdAt: customTimestamp || null,
    });

    const updated = await interventionService.changeStatus(interventionId, 'in_progress', customTimestamp || null);

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

    // Fire-and-forget check-in email
    import('../services/interventionEmail.service').then((m) => m.interventionEmailService.sendCheckInEmail(interventionId)).catch(() => {});
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
    const { latitude, longitude, accuracy, status, customTimestamp } = req.body;

    const finalStatus = status === 'issue' ? 'issue' : 'pending_validation';

    // 1. Load intervention first to get assignedTechnicianId
    const intervention = await interventionService.getById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // 2. Create timeline event (use assigned technician, not the logged-in admin)
    await timelineService.create({
      interventionId,
      technicianId: intervention.assignedTechnicianId ?? null,
      type: 'check_out',
      message: customTimestamp ? `Pointage manuel : ${customTimestamp.replace('T', ' ').slice(0, 16)}` : null,
      latitude: latitude ?? intervention.latitude ?? null,
      longitude: longitude ?? intervention.longitude ?? null,
      accuracy: accuracy ?? null,
      createdAt: customTimestamp || null,
    });

    const updated = await interventionService.changeStatus(interventionId, finalStatus, customTimestamp || null);

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

// POST /interventions/:id/pause — pause intervention
router.post('/:id/pause', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const interventionId = Number(req.params.id);
    const intervention = await interventionService.getById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    await timelineService.create({
      interventionId,
      technicianId: intervention.assignedTechnicianId ?? null,
      type: 'pause_start',
    });

    const updated = await interventionService.changeStatus(interventionId, 'paused');
    res.json({ success: true, data: updated });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE, { intervention: updated });
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: updated });
      if (intervention.assignedTechnicianId) {
        io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.TECHNICIAN_STATUS_CHANGED, { technicianId: intervention.assignedTechnicianId, status: 'on_break' });
      }
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /interventions/:id/resume — resume intervention after pause
router.post('/:id/resume', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const interventionId = Number(req.params.id);
    const intervention = await interventionService.getById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // Calculate pause duration from last pause_start event
    const timeline = await timelineService.getByIntervention(interventionId);
    const lastPauseStart = timeline.find((e) => e.type === 'pause_start');
    let pauseSeconds = 0;
    if (lastPauseStart) {
      pauseSeconds = Math.round((Date.now() - new Date(lastPauseStart.createdAt).getTime()) / 1000);
    }

    await timelineService.create({
      interventionId,
      technicianId: intervention.assignedTechnicianId ?? null,
      type: 'pause_end',
      message: pauseSeconds > 0 ? `Pause : ${Math.round(pauseSeconds / 60)} min` : null,
    });

    // Accumulate total pause time
    const currentTotal = intervention.totalPauseSeconds ?? 0;
    await db('interventions')
      .where({ id: interventionId })
      .update({ total_pause_seconds: currentTotal + pauseSeconds });

    const updated = await interventionService.changeStatus(interventionId, 'in_progress');
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

// POST /interventions/:id/close — supervisor validates and closes
router.post('/:id/close', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const interventionId = Number(req.params.id);

    const updated = await interventionService.changeStatus(interventionId, 'closed');
    res.json({ success: true, data: updated });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE, { intervention: updated });
      io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.INTERVENTION_UPDATED, { intervention: updated });
    }

    // Fire-and-forget closure email
    import('../services/interventionEmail.service').then((m) => m.interventionEmailService.sendClosureEmail(interventionId)).catch(() => {});
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
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

// DELETE /interventions/:id/photos/:photoId — delete a photo
router.delete('/:id/photos/:photoId', async (req, res) => {
  try {
    const interventionId = Number(req.params.id);
    const { photoService } = await import('../services/photo.service');
    const photo = await photoService.getById(Number(req.params.photoId));
    await photoService.deleteById(Number(req.params.photoId));

    // Record deletion in timeline
    if (photo) {
      await timelineService.create({
        interventionId,
        type: 'note',
        message: `Photo supprimee : ${photo.originalName}`,
      });
    }

    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /interventions/:id/photos/:photoId/visibility — toggle visibility in report
router.patch('/:id/photos/:photoId/visibility', async (req, res) => {
  try {
    const { photoService } = await import('../services/photo.service');
    const updated = await photoService.toggleVisibility(Number(req.params.photoId));
    if (!updated) return res.status(404).json({ success: false, error: 'Photo not found' });
    res.json({ success: true, data: updated });
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

// GET /interventions/:id/tech-link — generate signed TechPanel link
router.get('/:id/tech-link', async (req, res) => {
  try {
    const interventionId = Number(req.params.id);
    const intervention = await interventionService.getById(interventionId);
    if (!intervention) return res.status(404).json({ success: false, error: 'Not found' });

    const { generateTechPanelUrl } = await import('../utils/techPanelLink');
    const url = await generateTechPanelUrl(intervention.uid);
    if (!url) return res.status(400).json({ success: false, error: 'URL TechPanel non configuree dans les parametres' });

    res.json({ success: true, data: { url } });
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
    const logoPath = await appConfigService.get('company_logo_path');

    // Load custom PDF colors
    const colorKeys = [
      'pdf_color_primary', 'pdf_color_accent_line', 'pdf_color_section_bg',
      'pdf_color_section_text', 'pdf_color_label', 'pdf_color_value',
      'pdf_color_footer', 'pdf_color_border',
    ] as const;
    const colors: Record<string, string> = {};
    for (const k of colorKeys) {
      const v = await appConfigService.get(k);
      if (v) {
        const camel = k.replace('pdf_color_', '').replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        colors[camel] = v;
      }
    }

    const doc = generateInterventionPdf({
      intervention,
      timeline,
      photos,
      companyName,
      supervisorName: (req.query.supervisor as string) || intervention.supervisorName || undefined,
      logoPath: logoPath || null,
      colors,
    });

    const sanitize = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 50);
    const parts = ['rapport'];
    if (intervention.clientName) parts.push(sanitize(intervention.clientName));
    if (intervention.siteName) parts.push(sanitize(intervention.siteName));
    parts.push(sanitize(intervention.title));
    const filename = `${parts.join('-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

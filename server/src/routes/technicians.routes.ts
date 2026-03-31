import { Router } from 'express';
import { SOCKET_EVENTS } from '@oblifield/shared';
import { requireAdmin } from '../middleware/auth';
import { technicianService } from '../services/technician.service';

const router = Router();

// GET /technicians — list all technicians for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await technicianService.getAll(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /technicians/available — only available technicians
router.get('/available', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await technicianService.getAvailable(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /technicians/:id — detail
router.get('/:id', async (req, res) => {
  try {
    const data = await technicianService.getById(Number(req.params.id));
    if (!data) {
      return res.status(404).json({ success: false, error: 'Technician not found' });
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /technicians — create (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const {
      firstName, lastName, company, address, postalCode, city, country,
      phone, email, actionRadiusKm, type, typeOther, specialties,
    } = req.body;
    if (!firstName && !lastName) {
      return res.status(400).json({ success: false, error: 'firstName or lastName is required' });
    }
    const data = await technicianService.create({
      firstName, lastName, company, address, postalCode, city, country,
      phone, email, actionRadiusKm, type, typeOther, specialties,
    }, tenantId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /technicians/:id — update (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = await technicianService.update(Number(req.params.id), req.body);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Technician not found' });
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /technicians/:id — delete (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await technicianService.delete(Number(req.params.id));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /technicians/:id/status — update status
router.post('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }
    const technicianId = Number(req.params.id);
    const data = await technicianService.updateStatus(technicianId, status);
    res.json({ success: true, data });

    const tenantId = (req as any).tenantId;
    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.TECHNICIAN_STATUS_CHANGED, { technicianId, status, technician: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /technicians/:id/location — GPS update
router.post('/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: 'latitude and longitude are required' });
    }
    const technicianId = Number(req.params.id);
    const data = await technicianService.updateLocation(technicianId, latitude, longitude);
    res.json({ success: true, data });

    const tenantId = (req as any).tenantId;
    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.TECHNICIAN_LOCATION_UPDATED, { technicianId, latitude, longitude, technician: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

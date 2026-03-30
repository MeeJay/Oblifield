import { Router } from 'express';
import { SOCKET_EVENTS } from '@oblifield/shared';
import { requireAdmin } from '../middleware/auth';
import { clientService } from '../services/client.service';

const router = Router();

// GET /clients — list all clients for tenant (optional ?country=XX filter)
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const filters: { country?: string } = {};
    if (req.query.country) filters.country = req.query.country as string;
    const data = await clientService.getAll(tenantId, filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /clients/tree — hierarchical tree
router.get('/tree', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await clientService.getTree(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /clients/stats — intervention counts per client
router.get('/stats', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await clientService.getStats(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /clients/countries — distinct country list for filter dropdown
router.get('/countries', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await clientService.getCountries(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /clients/:id — detail
router.get('/:id', async (req, res) => {
  try {
    const data = await clientService.getById(Number(req.params.id));
    if (!data) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /clients — create (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await clientService.create(req.body, tenantId);
    res.status(201).json({ success: true, data });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.CLIENT_CREATED, { client: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /clients/:id — update (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await clientService.update(Number(req.params.id), req.body);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.json({ success: true, data });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.CLIENT_UPDATED, { client: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /clients/:id — delete (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = Number(req.params.id);
    await clientService.delete(clientId);
    res.json({ success: true, data: null });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit(SOCKET_EVENTS.CLIENT_DELETED, { clientId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { siteService } from '../services/site.service';

const router = Router();

// GET /sites — list all sites for tenant (optional ?clientId=&country= filters)
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const filters: { clientId?: number; country?: string } = {};
    if (req.query.clientId) filters.clientId = Number(req.query.clientId);
    if (req.query.country) filters.country = req.query.country as string;
    const data = await siteService.getAll(tenantId, filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /sites/countries — distinct country list
router.get('/countries', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await siteService.getCountries(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /sites/:id — detail
router.get('/:id', async (req, res) => {
  try {
    const data = await siteService.getById(Number(req.params.id));
    if (!data) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /sites — create (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await siteService.create(req.body, tenantId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /sites/:id — update (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = await siteService.update(Number(req.params.id), req.body);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /sites/:id — delete (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await siteService.delete(Number(req.params.id));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

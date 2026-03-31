import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { stepTemplateService } from '../services/stepTemplate.service';

const router = Router();

// GET /step-templates — list all for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await stepTemplateService.getAll(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /step-templates/:id — detail with items
router.get('/:id', async (req, res) => {
  try {
    const data = await stepTemplateService.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /step-templates — create (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, description, items } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one item is required' });
    }
    const data = await stepTemplateService.create({ name, description, items }, tenantId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /step-templates/:id — update (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = await stepTemplateService.update(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /step-templates/:id — delete (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await stepTemplateService.delete(Number(req.params.id));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

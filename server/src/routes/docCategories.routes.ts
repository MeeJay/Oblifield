import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { docCategoryService } from '../services/docCategory.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await docCategoryService.getAll(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/tree', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await docCategoryService.getTree(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await docCategoryService.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, description, parentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    const data = await docCategoryService.create({ name, description, parentId, sortOrder }, tenantId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = await docCategoryService.update(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await docCategoryService.delete(Number(req.params.id));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

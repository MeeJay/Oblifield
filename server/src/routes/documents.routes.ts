import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { documentService } from '../services/document.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { categoryId, search } = req.query;
    const filters: any = {};
    if (categoryId) filters.categoryId = Number(categoryId);
    if (search) filters.search = search as string;
    const data = await documentService.getAll(tenantId, filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await documentService.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, error: 'Document not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.session?.userId ?? 0;
    const { title, content, categoryId, sortOrder } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'title is required' });
    if (!categoryId) return res.status(400).json({ success: false, error: 'categoryId is required' });
    const data = await documentService.create({ title, content, categoryId, sortOrder }, tenantId, userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.session?.userId ?? 0;
    const data = await documentService.update(Number(req.params.id), req.body, userId);
    if (!data) return res.status(404).json({ success: false, error: 'Document not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await documentService.delete(Number(req.params.id));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

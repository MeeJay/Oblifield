import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { recurringScheduleService } from '../services/recurringSchedule.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await recurringScheduleService.getAll(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await recurringScheduleService.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, error: 'Schedule not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.session?.userId ?? 0;
    const { title, frequency } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'title is required' });
    if (!frequency) return res.status(400).json({ success: false, error: 'frequency is required' });
    const data = await recurringScheduleService.create(req.body, tenantId, userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = await recurringScheduleService.update(Number(req.params.id), req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Schedule not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await recurringScheduleService.delete(Number(req.params.id));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /recurring-schedules/process — manually trigger processing (admin)
router.post('/process', requireAdmin, async (req, res) => {
  try {
    const count = await recurringScheduleService.processDueSchedules();
    res.json({ success: true, data: { created: count } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

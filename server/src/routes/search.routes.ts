import { Router } from 'express';
import { searchService } from '../services/search.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const q = req.query.q as string;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }
    const data = await searchService.search(tenantId, q.trim());
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

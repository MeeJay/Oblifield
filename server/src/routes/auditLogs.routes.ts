import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { auditService } from '../services/audit.service';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { entityType, entityId, userId, limit, offset } = req.query;
    const filters: any = {};
    if (entityType) filters.entityType = entityType as string;
    if (entityId) filters.entityId = Number(entityId);
    if (userId) filters.userId = Number(userId);
    if (limit) filters.limit = Number(limit);
    if (offset) filters.offset = Number(offset);
    const data = await auditService.getAll(tenantId, filters);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/entity/:entityType/:entityId', requireAdmin, async (req, res) => {
  try {
    const data = await auditService.getByEntity(req.params.entityType, Number(req.params.entityId));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

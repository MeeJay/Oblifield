import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { reportService } from '../services/report.service';

const router = Router();

// All report routes require admin
router.use(requireAdmin);

// GET /reports/summary
router.get('/summary', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { from, to } = req.query;
    const data = await reportService.getSummary(tenantId, from as string, to as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /reports/technician/:id
router.get('/technician/:id', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { from, to } = req.query;
    const data = await reportService.getTechnicianReport(tenantId, Number(req.params.id), from as string, to as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /reports/client/:id
router.get('/client/:id', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { from, to } = req.query;
    const data = await reportService.getClientReport(tenantId, Number(req.params.id), from as string, to as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /reports/export/csv
router.get('/export/csv', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { from, to } = req.query;
    const csv = await reportService.exportCsv(tenantId, from as string, to as string);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="oblifield-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { appConfigController } from '../controllers/appConfig.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const LOGO_DIR = path.resolve('/app/uploads/logos');
fs.mkdirSync(LOGO_DIR, { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LOGO_DIR),
    filename: (_req, file, cb) => cb(null, `logo-${randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

// GET is available to all authenticated users (needed for profile page to check allow_2fa)
router.get('/', requireAuth, appConfigController.getAll);

// Specific named routes MUST come before /:key (otherwise /:key captures them first)

// Obligate SSO gateway config — admin only
router.get('/obligate', requireAuth, requireRole('admin'), appConfigController.getObligateConfig);
router.put('/obligate', requireAuth, requireRole('admin'), appConfigController.setObligateConfig);

// Logo upload — admin only
router.post('/logo', requireAuth, requireRole('admin'), (req, res) => {
  logoUpload.single('logo')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const { appConfigService } = await import('../services/appConfig.service');
    const logoPath = path.join(LOGO_DIR, req.file.filename);
    await appConfigService.set('company_logo_path', logoPath);

    res.json({ success: true, data: { path: `/uploads/logos/${req.file.filename}` } });
  });
});

// Generic key setter — must be LAST among PUT routes
router.put('/:key', requireAuth, requireRole('admin'), appConfigController.set);

export default router;

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { enrollmentController } from '../controllers/enrollment.controller';
import { passwordResetController } from '../controllers/passwordReset.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { loginSchema } from '../validators/auth.schema';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.get('/permissions', requireAuth, authController.permissions);

// Enrollment (requires auth — user must be logged in)
router.post('/enrollment', requireAuth, enrollmentController.complete);

// Set password (requires auth — used during enrollment for SSO users without a local password)
router.post('/set-password', requireAuth, async (req, res) => {
  try {
    const userId = req.session?.userId;
    const { password } = req.body;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    const { userService } = await import('../services/user.service');
    const ok = await userService.changePassword(userId, password);
    if (!ok) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Password reset (public)
router.post('/forgot-password', authLimiter, passwordResetController.forgot);
router.post('/reset-password/validate', passwordResetController.validate);
router.post('/reset-password', passwordResetController.reset);

export default router;

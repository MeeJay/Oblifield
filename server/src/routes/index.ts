import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
import settingsRoutes from './settings.routes';
import notificationsRoutes from './notifications.routes';
import usersRoutes from './users.routes';
import profileRoutes from './profile.routes';
import teamsRoutes from './teams.routes';
import importExportRoutes from './importExport.routes';
import smtpServerRoutes from './smtpServer.routes';
import appConfigRoutes from './appConfig.routes';
import twoFactorRoutes from './twoFactor.routes';
import { liveAlertRouter } from './liveAlert.routes';
import oblitoolsRoutes from './oblitools.routes';
import obligateCallbackRoutes from './obligateCallback.routes';
import permissionSetsRoutes from './permissionSets.routes';
import systemRoutes from './system.routes';
import interventionsRoutes from './interventions.routes';
import clientsRoutes from './clients.routes';
import techniciansRoutes from './technicians.routes';
import reportsRoutes from './reports.routes';
import sitesRoutes from './sites.routes';
import stepTemplatesRoutes from './stepTemplates.routes';

const router = Router();

// ── Global (no tenant required) ────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/admin/config', appConfigRoutes);
router.use('/system', systemRoutes);         // system info / about (admin only, no tenant required)
router.use('/oblitools', oblitoolsRoutes);  // ObliTools desktop manifest (auth required)
router.use('/auth', obligateCallbackRoutes); // Obligate sso-config + connected-apps (callback is mounted in app.ts at /auth)
router.use('/permission-sets', permissionSetsRoutes);
router.use('/profile/2fa', twoFactorRoutes); // must be before /profile

// ── Live alerts (mixed: /all is cross-tenant, rest is tenant-scoped — handled inside router) ──
router.use('/live-alerts', liveAlertRouter);

// ── Tenant management (requireAuth but NOT requireTenant) ──────────────────
// /api/tenants  (CRUD + member management)
// /api/tenant/switch
router.use('/tenants', tenantRoutes);
router.use('/tenant', tenantRoutes);

// ── Tenant-scoped routes (requireAuth + requireTenant) ─────────────────────
const tenantRouter = Router();
tenantRouter.use(requireAuth);
tenantRouter.use(requireTenant);

tenantRouter.use('/interventions', interventionsRoutes);
tenantRouter.use('/clients', clientsRoutes);
tenantRouter.use('/sites', sitesRoutes);
tenantRouter.use('/technicians', techniciansRoutes);
tenantRouter.use('/reports', reportsRoutes);
tenantRouter.use('/step-templates', stepTemplatesRoutes);
tenantRouter.use('/settings', settingsRoutes);
tenantRouter.use('/notifications', notificationsRoutes);
tenantRouter.use('/users', usersRoutes);
tenantRouter.use('/profile', profileRoutes);
tenantRouter.use('/teams', teamsRoutes);
tenantRouter.use('/admin', importExportRoutes);
tenantRouter.use('/admin/smtp-servers', smtpServerRoutes);

router.use('/', tenantRouter);

export { router as routes };

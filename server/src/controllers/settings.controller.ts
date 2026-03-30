import type { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
// MonitorWorkerManager removed (no longer applicable)
import type { SettingsScope } from '@oblifield/shared';
import type { SettingsKey } from '@oblifield/shared';
import { AppError } from '../middleware/errorHandler';
import type { SetSettingInput, SetSettingsBulkInput, DeleteSettingInput } from '../validators/settings.schema';

function parseScope(req: Request): { scope: SettingsScope; scopeId: number | null } {
  const { scope, scopeId } = req.params;

  if (scope === 'global') return { scope: 'global', scopeId: null };
  if (scope === 'client' || scope === 'intervention') {
    const id = parseInt(scopeId, 10);
    if (isNaN(id)) throw new AppError(400, 'Invalid scope ID');
    return { scope, scopeId: id };
  }
  throw new AppError(400, 'Invalid scope. Must be global, client, or intervention');
}

export const settingsController = {
  // GET /api/settings/global/resolved
  async getGlobalResolved(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.resolveGlobal();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/settings/client/:scopeId/resolved
  async getClientResolved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = parseInt(req.params.scopeId, 10);
      if (isNaN(clientId)) throw new AppError(400, 'Invalid client ID');
      const result = await settingsService.resolveForGroup(clientId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/settings/intervention/:scopeId/resolved
  async getInterventionResolved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const interventionId = parseInt(req.params.scopeId, 10);
      if (isNaN(interventionId)) throw new AppError(400, 'Invalid intervention ID');

      // Need the intervention's client_id
      const { db: database } = await import('../db');
      const intervention = await database('interventions').where({ id: interventionId }).first();
      if (!intervention) throw new AppError(404, 'Intervention not found');

      const resolved = await settingsService.resolveForMonitor(interventionId, intervention.client_id);

      // Also get intervention-level overrides specifically
      const overrides = await settingsService.getByScope('intervention', interventionId);

      res.json({ success: true, data: { resolved, overrides } });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/settings/:scope/:scopeId
  async set(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scope, scopeId } = parseScope(req);
      const { key, value } = req.body as SetSettingInput;

      await settingsService.set(scope, scopeId, key as SettingsKey, value);

      // Broadcast settings update
      const io = req.app.get('io');
      if (io) {
        io.to('role:admin').emit('settings:updated', { scope, scopeId, key, value });
      }

      res.json({ success: true, message: 'Setting saved' });
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes('must be between') || err.message.includes('Unknown setting'))) {
        next(new AppError(400, err.message));
      } else {
        next(err);
      }
    }
  },

  // PUT /api/settings/:scope/:scopeId/bulk
  async setBulk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scope, scopeId } = parseScope(req);
      const { overrides } = req.body as SetSettingsBulkInput;

      await settingsService.setBulk(
        scope,
        scopeId,
        overrides.map((o) => ({ key: o.key as SettingsKey, value: o.value })),
      );


      const io = req.app.get('io');
      if (io) {
        io.to('role:admin').emit('settings:updated', { scope, scopeId, overrides });
      }

      res.json({ success: true, message: 'Settings saved' });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/settings/:scope/:scopeId/:key  (reset to inherited)
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scope, scopeId } = parseScope(req);
      const { key } = req.params;

      const deleted = await settingsService.remove(scope, scopeId, key as SettingsKey);

      if (deleted) {
        const io = req.app.get('io');
        if (io) {
          io.to('role:admin').emit('settings:updated', { scope, scopeId, key, removed: true });
        }
      }

      res.json({ success: true, message: deleted ? 'Setting reset to inherited' : 'No override found' });
    } catch (err) {
      next(err);
    }
  },
};

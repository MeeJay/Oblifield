import type { Request, Response, NextFunction } from 'express';
import { smtpServerService } from '../services/smtpServer.service';
import { AppError } from '../middleware/errorHandler';

export const smtpServerController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const servers = await smtpServerService.list(req.tenantId);
      res.json({ success: true, data: servers });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, host, port, secure, username, password, fromAddress, authType, oauthClientId, oauthClientSecret, oauthTenantId, oauthRefreshToken } = req.body;
      if (!name || !username || !fromAddress) {
        throw new AppError(400, 'Missing required fields');
      }
      const server = await smtpServerService.create({
        name, host: host || 'smtp.office365.com', port: Number(port) || 587, secure: Boolean(secure), username, password: password || '',
        fromAddress, tenantId: req.tenantId,
        authType, oauthClientId, oauthClientSecret, oauthTenantId, oauthRefreshToken,
      });
      res.status(201).json({ success: true, data: server });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, host, port, secure, username, password, fromAddress, authType, oauthClientId, oauthClientSecret, oauthTenantId, oauthRefreshToken } = req.body;
      const server = await smtpServerService.update(id, {
        ...(name !== undefined && { name }),
        ...(host !== undefined && { host }),
        ...(port !== undefined && { port: Number(port) }),
        ...(secure !== undefined && { secure: Boolean(secure) }),
        ...(username !== undefined && { username }),
        ...(password !== undefined && { password }),
        ...(fromAddress !== undefined && { fromAddress }),
        ...(authType !== undefined && { authType }),
        ...(oauthClientId !== undefined && { oauthClientId }),
        ...(oauthClientSecret !== undefined && { oauthClientSecret }),
        ...(oauthTenantId !== undefined && { oauthTenantId }),
        ...(oauthRefreshToken !== undefined && { oauthRefreshToken }),
      });
      if (!server) throw new AppError(404, 'SMTP server not found');
      res.json({ success: true, data: server });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const removed = await smtpServerService.delete(id);
      if (!removed) throw new AppError(404, 'SMTP server not found');
      res.json({ success: true });
    } catch (err) { next(err); }
  },

  async test(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await smtpServerService.test(id);
      res.json({ success: true, message: 'Connection successful' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      next(new AppError(400, `SMTP test failed: ${msg}`));
    }
  },
};

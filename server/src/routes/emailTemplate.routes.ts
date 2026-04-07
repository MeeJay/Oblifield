import { Router } from 'express';
import { emailTemplateService } from '../services/emailTemplate.service';
import { smtpServerService } from '../services/smtpServer.service';
import { appConfigService } from '../services/appConfig.service';
import nodemailer from 'nodemailer';

const router = Router();

// GET /email-templates
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = await emailTemplateService.list(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /email-templates/:id
router.get('/:id', async (req, res) => {
  try {
    const data = await emailTemplateService.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /email-templates
router.post('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { slug, language, subject, bodyHtml, enabled } = req.body;
    const data = await emailTemplateService.create({ slug, language, subject, bodyHtml, enabled, tenantId });
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /email-templates/:id
router.put('/:id', async (req, res) => {
  try {
    const { subject, bodyHtml, enabled } = req.body;
    const data = await emailTemplateService.update(Number(req.params.id), { subject, bodyHtml, enabled });
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /email-templates/:id
router.delete('/:id', async (req, res) => {
  try {
    await emailTemplateService.delete(Number(req.params.id));
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /email-templates/:id/preview
router.post('/:id/preview', async (req, res) => {
  try {
    const template = await emailTemplateService.getById(Number(req.params.id));
    if (!template) return res.status(404).json({ success: false, error: 'Not found' });
    const variables = { ...emailTemplateService.getSampleVariables(), ...(req.body.variables || {}) };
    const rendered = emailTemplateService.render(template, variables);
    res.json({ success: true, data: rendered });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /email-templates/:id/test-send
router.post('/:id/test-send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required' });

    const template = await emailTemplateService.getById(Number(req.params.id));
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    const smtpServerId = await appConfigService.get('email_notification_smtp_server_id');
    if (!smtpServerId) return res.status(400).json({ success: false, error: 'Aucun serveur SMTP configure' });

    const smtpServer = await smtpServerService.getById(Number(smtpServerId));
    if (!smtpServer) return res.status(400).json({ success: false, error: 'Serveur SMTP introuvable' });

    const variables = emailTemplateService.getSampleVariables();
    const { subject, html } = emailTemplateService.render(template, variables);

    const transportConfig = await smtpServerService.getTransportConfig(Number(smtpServerId));
    if (!transportConfig) return res.status(400).json({ success: false, error: 'Config SMTP invalide' });
    const transporter = nodemailer.createTransport(transportConfig);
    await transporter.sendMail({ from: smtpServer.from_address, to: email, subject, html });

    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

import nodemailer from 'nodemailer';
import { interventionService } from './intervention.service';
import { emailTemplateService } from './emailTemplate.service';
import { appConfigService } from './appConfig.service';
import { smtpServerService } from './smtpServer.service';
import { generateTechPanelUrl } from '../utils/techPanelLink';
import { db } from '../db';

async function getTechnicianWithLanguage(technicianId: number) {
  return db('technicians')
    .where({ id: technicianId })
    .select('id', 'first_name', 'last_name', 'email', 'preferred_language')
    .first();
}

async function sendEmail(slug: string, interventionId: number): Promise<void> {
  const intervention = await interventionService.getById(interventionId);
  if (!intervention || !intervention.assignedTechnicianId) return;

  const tech = await getTechnicianWithLanguage(intervention.assignedTechnicianId);
  if (!tech || !tech.email) return;

  const smtpServerId = await appConfigService.get('email_notification_smtp_server_id');
  if (!smtpServerId) return;

  const smtpServer = await smtpServerService.getById(Number(smtpServerId));
  if (!smtpServer) return;

  const language = tech.preferred_language || 'fr';
  const template = await emailTemplateService.getBySlugAndLanguage(slug, language, intervention.tenantId);
  if (!template || !template.enabled) return;

  const companyName = await appConfigService.get('company_name') || 'Oblifield';
  const techPanelLink = await generateTechPanelUrl(intervention.uid) || '';

  const scheduledAt = intervention.scheduledAt
    ? new Date(intervention.scheduledAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
    : '-';

  const variables: Record<string, string> = {
    technicianName: `${tech.first_name} ${tech.last_name}`,
    interventionTitle: intervention.title,
    interventionUid: intervention.uid,
    clientName: intervention.clientName || '-',
    siteName: intervention.siteName || '-',
    scheduledAt,
    techPanelLink,
    companyName,
  };

  const { subject, html } = emailTemplateService.render(template, variables);

  const transportConfig = await smtpServerService.getTransportConfig(Number(smtpServerId));
  if (!transportConfig) return;
  const transporter = nodemailer.createTransport(transportConfig);

  await transporter.sendMail({
    from: smtpServer.from_address,
    to: tech.email,
    subject,
    html,
  });
}

export const interventionEmailService = {
  async sendAssignmentEmail(interventionId: number): Promise<void> {
    try {
      await sendEmail('intervention_assigned', interventionId);
    } catch (err) {
      console.error('[InterventionEmail] Assignment email failed:', err);
    }
  },

  async sendCheckInEmail(interventionId: number): Promise<void> {
    try {
      await sendEmail('intervention_checkin', interventionId);
    } catch (err) {
      console.error('[InterventionEmail] Check-in email failed:', err);
    }
  },

  async sendClosureEmail(interventionId: number): Promise<void> {
    try {
      await sendEmail('intervention_closed', interventionId);
    } catch (err) {
      console.error('[InterventionEmail] Closure email failed:', err);
    }
  },
};

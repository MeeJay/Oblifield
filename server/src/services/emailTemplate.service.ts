import { db } from '../db';
import type { EmailTemplate } from '@oblifield/shared';
import Handlebars from 'handlebars';

interface EmailTemplateRow {
  id: number;
  slug: string;
  language: string;
  subject: string;
  body_html: string;
  enabled: boolean;
  tenant_id: number | null;
  created_at: Date;
  updated_at: Date;
}

function rowToTemplate(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    slug: row.slug,
    language: row.language,
    subject: row.subject,
    bodyHtml: row.body_html,
    enabled: row.enabled,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const emailTemplateService = {
  async list(tenantId?: number): Promise<EmailTemplate[]> {
    const rows = await db('email_templates')
      .where((qb) => {
        qb.whereNull('tenant_id');
        if (tenantId != null) qb.orWhere('tenant_id', tenantId);
      })
      .orderBy(['slug', 'language']);
    return rows.map(rowToTemplate);
  },

  async getById(id: number): Promise<EmailTemplate | null> {
    const row = await db('email_templates').where({ id }).first();
    return row ? rowToTemplate(row) : null;
  },

  async getBySlugAndLanguage(slug: string, language: string, tenantId?: number): Promise<EmailTemplate | null> {
    // 1. Tenant-specific template in requested language
    if (tenantId != null) {
      const row = await db('email_templates').where({ slug, language, tenant_id: tenantId }).first();
      if (row) return rowToTemplate(row);
    }
    // 2. Global template in requested language
    const globalRow = await db('email_templates').where({ slug, language }).whereNull('tenant_id').first();
    if (globalRow) return rowToTemplate(globalRow);
    // 3. Fallback to French
    if (language !== 'fr') {
      const fallback = await db('email_templates').where({ slug, language: 'fr' }).whereNull('tenant_id').first();
      if (fallback) return rowToTemplate(fallback);
    }
    return null;
  },

  async create(data: { slug: string; language: string; subject: string; bodyHtml: string; enabled?: boolean; tenantId?: number | null }): Promise<EmailTemplate> {
    const [row] = await db('email_templates')
      .insert({
        slug: data.slug,
        language: data.language,
        subject: data.subject,
        body_html: data.bodyHtml,
        enabled: data.enabled ?? true,
        tenant_id: data.tenantId ?? null,
      })
      .returning('*');
    return rowToTemplate(row);
  },

  async update(id: number, data: Partial<{ subject: string; bodyHtml: string; enabled: boolean }>): Promise<EmailTemplate | null> {
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.bodyHtml !== undefined) updateData.body_html = data.bodyHtml;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    const [row] = await db('email_templates').where({ id }).update(updateData).returning('*');
    return row ? rowToTemplate(row) : null;
  },

  async delete(id: number): Promise<void> {
    await db('email_templates').where({ id }).del();
  },

  render(template: EmailTemplate, variables: Record<string, string>): { subject: string; html: string } {
    const subjectFn = Handlebars.compile(template.subject);
    const bodyFn = Handlebars.compile(template.bodyHtml);
    return {
      subject: subjectFn(variables),
      html: bodyFn(variables),
    };
  },

  getSampleVariables(): Record<string, string> {
    return {
      technicianName: 'Jean Dupont',
      interventionTitle: 'Maintenance climatisation',
      interventionUid: 'A1B2C3D4',
      clientName: 'ACME Corp',
      siteName: 'Siege Paris',
      scheduledAt: '15/04/2026 09:00',
      techPanelLink: 'https://techpanel.example.com/A1B2C3D4?sig=abc123&ts=1234567890',
      companyName: 'Mon Entreprise',
    };
  },
};

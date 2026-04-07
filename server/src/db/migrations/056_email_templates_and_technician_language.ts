import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add preferred_language to technicians
  await knex.schema.alterTable('technicians', (t) => {
    t.string('preferred_language', 10).notNullable().defaultTo('fr');
  });

  // 2. Add OAuth365 fields to smtp_servers
  await knex.schema.alterTable('smtp_servers', (t) => {
    t.string('auth_type', 20).notNullable().defaultTo('basic');
    t.string('oauth_client_id', 255).nullable();
    t.string('oauth_client_secret', 512).nullable();
    t.string('oauth_tenant_id', 255).nullable();
    t.text('oauth_refresh_token').nullable();
  });

  // 3. Create email_templates table
  await knex.schema.createTable('email_templates', (t) => {
    t.increments('id').primary();
    t.string('slug', 64).notNullable();
    t.string('language', 10).notNullable();
    t.string('subject', 512).notNullable();
    t.text('body_html').notNullable();
    t.boolean('enabled').notNullable().defaultTo(true);
    t.integer('tenant_id').unsigned().nullable().references('id').inTable('tenants').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['slug', 'language', 'tenant_id']);
  });

  // 4. Seed default templates
  const templates = [
    {
      slug: 'intervention_assigned',
      language: 'fr',
      subject: '[{{companyName}}] Nouvelle intervention assignée - {{interventionTitle}}',
      body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<h2 style="color:#2D3561">Bonjour {{technicianName}},</h2>
<p>Une nouvelle intervention vous a été assignée :</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Intervention</td><td style="padding:8px;border:1px solid #ddd">{{interventionTitle}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace">{{interventionUid}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Client</td><td style="padding:8px;border:1px solid #ddd">{{clientName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Site</td><td style="padding:8px;border:1px solid #ddd">{{siteName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Date prévue</td><td style="padding:8px;border:1px solid #ddd">{{scheduledAt}}</td></tr>
</table>
<p><a href="{{techPanelLink}}" style="display:inline-block;background:#2D3561;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Accéder à l'intervention</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#999;font-size:12px">{{companyName}} — Ce lien est valide pendant 7 jours.</p>
</div>`,
    },
    {
      slug: 'intervention_assigned',
      language: 'en',
      subject: '[{{companyName}}] New intervention assigned - {{interventionTitle}}',
      body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<h2 style="color:#2D3561">Hello {{technicianName}},</h2>
<p>A new intervention has been assigned to you:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Intervention</td><td style="padding:8px;border:1px solid #ddd">{{interventionTitle}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace">{{interventionUid}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Client</td><td style="padding:8px;border:1px solid #ddd">{{clientName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Site</td><td style="padding:8px;border:1px solid #ddd">{{siteName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Scheduled</td><td style="padding:8px;border:1px solid #ddd">{{scheduledAt}}</td></tr>
</table>
<p><a href="{{techPanelLink}}" style="display:inline-block;background:#2D3561;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Access intervention</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#999;font-size:12px">{{companyName}} — This link is valid for 7 days.</p>
</div>`,
    },
    {
      slug: 'intervention_checkin',
      language: 'fr',
      subject: '[{{companyName}}] Confirmation de pointage - {{interventionTitle}}',
      body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<h2 style="color:#2D3561">Bonjour {{technicianName}},</h2>
<p>Votre pointage d'entrée a bien été enregistré pour l'intervention :</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Intervention</td><td style="padding:8px;border:1px solid #ddd">{{interventionTitle}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Client</td><td style="padding:8px;border:1px solid #ddd">{{clientName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Site</td><td style="padding:8px;border:1px solid #ddd">{{siteName}}</td></tr>
</table>
<p><a href="{{techPanelLink}}" style="display:inline-block;background:#2D3561;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Accéder à l'intervention</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#999;font-size:12px">{{companyName}}</p>
</div>`,
    },
    {
      slug: 'intervention_checkin',
      language: 'en',
      subject: '[{{companyName}}] Check-in confirmation - {{interventionTitle}}',
      body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<h2 style="color:#2D3561">Hello {{technicianName}},</h2>
<p>Your check-in has been recorded for the following intervention:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Intervention</td><td style="padding:8px;border:1px solid #ddd">{{interventionTitle}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Client</td><td style="padding:8px;border:1px solid #ddd">{{clientName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Site</td><td style="padding:8px;border:1px solid #ddd">{{siteName}}</td></tr>
</table>
<p><a href="{{techPanelLink}}" style="display:inline-block;background:#2D3561;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Access intervention</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#999;font-size:12px">{{companyName}}</p>
</div>`,
    },
    {
      slug: 'intervention_closed',
      language: 'fr',
      subject: '[{{companyName}}] Intervention clôturée - {{interventionTitle}}',
      body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<h2 style="color:#2D3561">Bonjour {{technicianName}},</h2>
<p>L'intervention suivante a été clôturée avec succès :</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Intervention</td><td style="padding:8px;border:1px solid #ddd">{{interventionTitle}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace">{{interventionUid}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Client</td><td style="padding:8px;border:1px solid #ddd">{{clientName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Site</td><td style="padding:8px;border:1px solid #ddd">{{siteName}}</td></tr>
</table>
<p>Merci pour votre travail.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#999;font-size:12px">{{companyName}}</p>
</div>`,
    },
    {
      slug: 'intervention_closed',
      language: 'en',
      subject: '[{{companyName}}] Intervention closed - {{interventionTitle}}',
      body_html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
<h2 style="color:#2D3561">Hello {{technicianName}},</h2>
<p>The following intervention has been successfully closed:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Intervention</td><td style="padding:8px;border:1px solid #ddd">{{interventionTitle}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">ID</td><td style="padding:8px;border:1px solid #ddd;font-family:monospace">{{interventionUid}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Client</td><td style="padding:8px;border:1px solid #ddd">{{clientName}}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Site</td><td style="padding:8px;border:1px solid #ddd">{{siteName}}</td></tr>
</table>
<p>Thank you for your work.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#999;font-size:12px">{{companyName}}</p>
</div>`,
    },
  ];

  for (const tpl of templates) {
    await knex('email_templates').insert({ ...tpl, tenant_id: null });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_templates');
  await knex.schema.alterTable('smtp_servers', (t) => {
    t.dropColumn('auth_type');
    t.dropColumn('oauth_client_id');
    t.dropColumn('oauth_client_secret');
    t.dropColumn('oauth_tenant_id');
    t.dropColumn('oauth_refresh_token');
  });
  await knex.schema.alterTable('technicians', (t) => {
    t.dropColumn('preferred_language');
  });
}

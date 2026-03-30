import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create sites table
  await knex.schema.createTable('sites', (t) => {
    t.increments('id').primary();
    t.integer('client_id').unsigned().notNullable()
      .references('id').inTable('clients').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.text('address').nullable();
    t.string('city', 255).nullable();
    t.string('postal_code', 50).nullable();
    t.string('region', 255).nullable();
    t.string('country', 100).nullable();
    t.decimal('latitude', 10, 7).nullable();
    t.decimal('longitude', 10, 7).nullable();
    t.string('contact_name', 255).nullable();
    t.string('contact_phone', 100).nullable();
    t.string('contact_email', 255).nullable();
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamps(true, true);
    t.index('client_id');
    t.index('country');
    t.index('tenant_id');
  });

  // Move intervention.site_id FK from clients to sites
  await knex.schema.alterTable('interventions', (t) => {
    t.dropForeign('site_id');
  });
  await knex.schema.alterTable('interventions', (t) => {
    t.foreign('site_id').references('id').inTable('sites').onDelete('SET NULL');
  });

  // Remove address fields from clients (they belong to sites now)
  await knex.schema.alterTable('clients', (t) => {
    t.dropColumn('address');
    t.dropColumn('city');
    t.dropColumn('postal_code');
    t.dropColumn('region');
    t.dropColumn('country');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Restore address fields on clients
  await knex.schema.alterTable('clients', (t) => {
    t.text('address').nullable();
    t.string('city', 255).nullable();
    t.string('postal_code', 50).nullable();
    t.string('region', 255).nullable();
    t.string('country', 100).nullable();
  });

  await knex.schema.alterTable('interventions', (t) => {
    t.dropForeign('site_id');
  });
  await knex.schema.alterTable('interventions', (t) => {
    t.foreign('site_id').references('id').inTable('clients').onDelete('SET NULL');
  });

  await knex.schema.dropTableIfExists('sites');
}

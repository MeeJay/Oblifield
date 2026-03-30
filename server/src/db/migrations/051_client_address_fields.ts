import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('clients', (t) => {
    t.string('city', 255).nullable();
    t.string('postal_code', 50).nullable();
    t.string('region', 255).nullable();
    t.string('country', 100).nullable();
    t.index('country');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('clients', (t) => {
    t.dropIndex('country');
    t.dropColumn('country');
    t.dropColumn('region');
    t.dropColumn('postal_code');
    t.dropColumn('city');
  });
}

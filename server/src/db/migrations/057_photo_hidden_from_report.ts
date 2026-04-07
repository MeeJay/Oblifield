import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('intervention_photos', (t) => {
    t.boolean('hidden_from_report').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('intervention_photos', (t) => {
    t.dropColumn('hidden_from_report');
  });
}

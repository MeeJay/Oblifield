import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('interventions', (t) => {
    t.string('supervisor_name', 255).nullable();
    t.string('ticket_reference', 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('interventions', (t) => {
    t.dropColumn('ticket_reference');
    t.dropColumn('supervisor_name');
  });
}

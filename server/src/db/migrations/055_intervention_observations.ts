import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('interventions', (t) => {
    t.text('technician_observations').nullable();
    t.text('supervisor_observations').nullable();
    t.integer('supervisor_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('interventions', (t) => {
    t.dropForeign('supervisor_id');
    t.dropColumn('supervisor_id');
    t.dropColumn('supervisor_observations');
    t.dropColumn('technician_observations');
  });
}

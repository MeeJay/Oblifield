import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Rename 'done' status to 'pending_validation'
  await knex('interventions')
    .where('status', 'done')
    .update({ status: 'pending_validation' });

  // Add total_pause_seconds column
  await knex.schema.alterTable('interventions', (t) => {
    t.integer('total_pause_seconds').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex('interventions')
    .where('status', 'pending_validation')
    .update({ status: 'done' });

  await knex('interventions')
    .where('status', 'closed')
    .update({ status: 'done' });

  await knex.schema.alterTable('interventions', (t) => {
    t.dropColumn('total_pause_seconds');
  });
}

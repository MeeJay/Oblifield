import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('technicians', (t) => {
    // Drop user link
    t.dropForeign('user_id');
    t.dropColumn('user_id');
    // New identity fields
    t.string('first_name', 255).notNullable().defaultTo('');
    t.string('last_name', 255).notNullable().defaultTo('');
    t.string('company', 255).nullable();
    t.text('address').nullable();
    t.string('postal_code', 50).nullable();
    t.string('city', 255).nullable();
    t.string('country', 100).nullable();
    t.string('email', 255).nullable();
    t.integer('action_radius_km').nullable();
    t.string('type', 100).nullable();       // electrician, it, other
    t.string('type_other', 255).nullable();  // precision if type=other
    t.decimal('rating', 3, 2).nullable();    // 0.00 - 5.00
  });

  // Drop the unique constraint on (tenant_id, user_id) since user_id is gone
  // The unique index may have been named automatically - drop by columns
  try {
    await knex.schema.alterTable('technicians', (t) => {
      t.dropUnique(['tenant_id', 'user_id']);
    });
  } catch { /* index may not exist */ }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('technicians', (t) => {
    t.dropColumn('rating');
    t.dropColumn('type_other');
    t.dropColumn('type');
    t.dropColumn('action_radius_km');
    t.dropColumn('email');
    t.dropColumn('country');
    t.dropColumn('city');
    t.dropColumn('postal_code');
    t.dropColumn('address');
    t.dropColumn('company');
    t.dropColumn('last_name');
    t.dropColumn('first_name');
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('CASCADE');
  });
}

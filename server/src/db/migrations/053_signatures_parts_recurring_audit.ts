import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Audit logs
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('username', 128).nullable();
    t.string('action', 100).notNullable(); // create, update, delete, status_change, login, etc.
    t.string('entity_type', 100).notNullable(); // intervention, technician, client, etc.
    t.integer('entity_id').unsigned().nullable();
    t.string('entity_label', 500).nullable(); // human-readable label of the entity
    t.jsonb('changes').nullable(); // { field: { old, new } }
    t.string('ip_address', 50).nullable();
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['tenant_id', 'created_at']);
    t.index(['entity_type', 'entity_id']);
    t.index('user_id');
  });

  // 2. Intervention signatures
  await knex.schema.createTable('intervention_signatures', (t) => {
    t.increments('id').primary();
    t.integer('intervention_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('interventions')
      .onDelete('CASCADE');
    t.string('type', 50).notNullable(); // 'technician' | 'supervisor'
    t.text('signature_data').notNullable(); // base64 PNG data
    t.string('signer_name', 255).notNullable();
    t.integer('signed_by_user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('signed_by_technician_id').unsigned().nullable().references('id').inTable('technicians').onDelete('SET NULL');
    t.timestamp('signed_at').notNullable().defaultTo(knex.fn.now());

    t.index('intervention_id');
    t.unique(['intervention_id', 'type']);
  });

  // 3. Intervention parts / materials
  await knex.schema.createTable('intervention_parts', (t) => {
    t.increments('id').primary();
    t.integer('intervention_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('interventions')
      .onDelete('CASCADE');
    t.string('name', 500).notNullable();
    t.string('reference', 255).nullable();
    t.decimal('quantity', 10, 2).notNullable().defaultTo(1);
    t.string('unit', 50).nullable(); // piece, m, kg, L, etc.
    t.decimal('unit_price', 10, 2).nullable();
    t.text('notes').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('intervention_id');
  });

  // 4. Recurring intervention schedules
  await knex.schema.createTable('recurring_schedules', (t) => {
    t.increments('id').primary();
    t.string('title', 500).notNullable();
    t.text('description').nullable();
    t.string('type', 50).notNullable().defaultTo('maintenance');
    t.string('priority', 50).notNullable().defaultTo('normal');
    t.integer('client_id').unsigned().nullable().references('id').inTable('clients').onDelete('SET NULL');
    t.integer('site_id').unsigned().nullable().references('id').inTable('sites').onDelete('SET NULL');
    t.integer('assigned_technician_id').unsigned().nullable().references('id').inTable('technicians').onDelete('SET NULL');
    t.integer('step_template_id').unsigned().nullable().references('id').inTable('step_templates').onDelete('SET NULL');
    t.string('frequency', 50).notNullable(); // daily, weekly, monthly, yearly
    t.integer('interval').notNullable().defaultTo(1); // every N frequency units
    t.integer('day_of_week').nullable(); // 0-6 for weekly
    t.integer('day_of_month').nullable(); // 1-31 for monthly
    t.integer('month_of_year').nullable(); // 1-12 for yearly
    t.string('time_of_day', 10).nullable(); // HH:MM
    t.integer('estimated_duration_minutes').nullable();
    t.text('address').nullable();
    t.string('contact_name', 255).nullable();
    t.string('contact_phone', 100).nullable();
    t.timestamp('next_run_at').nullable();
    t.timestamp('last_run_at').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamps(true, true);

    t.index(['tenant_id', 'is_active']);
    t.index('next_run_at');
  });

  // Add recurring_schedule_id to interventions
  await knex.schema.alterTable('interventions', (t) => {
    t.integer('recurring_schedule_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('recurring_schedules')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('interventions', (t) => {
    t.dropForeign('recurring_schedule_id');
    t.dropColumn('recurring_schedule_id');
  });
  await knex.schema.dropTableIfExists('recurring_schedules');
  await knex.schema.dropTableIfExists('intervention_parts');
  await knex.schema.dropTableIfExists('intervention_signatures');
  await knex.schema.dropTableIfExists('audit_logs');
}

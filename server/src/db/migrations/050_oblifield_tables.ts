import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Clients table (replaces monitor_groups for domain use)
  await knex.schema.createTable('clients', (t) => {
    t.increments('id').primary();
    t.string('name', 255).notNullable();
    t.string('slug', 255).notNullable();
    t.text('description').nullable();
    t.text('address').nullable();
    t.string('contact_name', 255).nullable();
    t.string('contact_phone', 100).nullable();
    t.string('contact_email', 255).nullable();
    t.integer('parent_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('clients')
      .onDelete('CASCADE');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamps(true, true);

    t.unique(['tenant_id', 'slug']);
    t.index('parent_id');
  });

  // 2. Client closure table for hierarchical queries
  await knex.schema.createTable('client_closure', (t) => {
    t.integer('ancestor_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('clients')
      .onDelete('CASCADE');
    t.integer('descendant_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('clients')
      .onDelete('CASCADE');
    t.integer('depth').notNullable();

    t.primary(['ancestor_id', 'descendant_id']);
    t.index('descendant_id');
    t.index('ancestor_id');
  });

  // 3. Technicians table
  await knex.schema.createTable('technicians', (t) => {
    t.increments('id').primary();
    t.integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    t.string('status', 50).notNullable().defaultTo('offline');
    t.integer('current_intervention_id').unsigned().nullable();
    t.decimal('last_latitude', 10, 7).nullable();
    t.decimal('last_longitude', 10, 7).nullable();
    t.timestamp('last_location_at').nullable();
    t.string('phone', 100).nullable();
    t.jsonb('specialties').notNullable().defaultTo('[]');
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamps(true, true);

    t.unique(['tenant_id', 'user_id']);
  });

  // 4. Interventions table
  await knex.schema.createTable('interventions', (t) => {
    t.increments('id').primary();
    t.string('title', 500).notNullable();
    t.text('description').nullable();
    t.string('type', 50).notNullable().defaultTo('other');
    t.string('status', 50).notNullable().defaultTo('pending');
    t.string('priority', 50).notNullable().defaultTo('normal');
    t.integer('client_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('clients')
      .onDelete('SET NULL');
    t.integer('site_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('clients')
      .onDelete('SET NULL');
    t.integer('assigned_technician_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('technicians')
      .onDelete('SET NULL');
    t.timestamp('scheduled_at').nullable();
    t.timestamp('due_at').nullable();
    t.timestamp('started_at').nullable();
    t.timestamp('completed_at').nullable();
    t.text('address').nullable();
    t.decimal('latitude', 10, 7).nullable();
    t.decimal('longitude', 10, 7).nullable();
    t.string('contact_name', 255).nullable();
    t.string('contact_phone', 100).nullable();
    t.string('contact_email', 255).nullable();
    t.integer('estimated_duration_minutes').nullable();
    t.integer('created_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamps(true, true);

    t.index(['tenant_id', 'status']);
    t.index('assigned_technician_id');
    t.index('client_id');
    t.index('scheduled_at');
  });

  // Add FK from technicians.current_intervention_id → interventions.id
  await knex.schema.alterTable('technicians', (t) => {
    t.foreign('current_intervention_id')
      .references('id')
      .inTable('interventions')
      .onDelete('SET NULL');
  });

  // 5. Timeline events table
  await knex.schema.createTable('timeline_events', (t) => {
    t.increments('id').primary();
    t.integer('intervention_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('interventions')
      .onDelete('CASCADE');
    t.string('type', 50).notNullable();
    t.integer('technician_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('technicians')
      .onDelete('SET NULL');
    t.decimal('latitude', 10, 7).nullable();
    t.decimal('longitude', 10, 7).nullable();
    t.decimal('accuracy', 10, 2).nullable();
    t.text('message').nullable();
    t.string('photo_url', 1000).nullable();
    t.string('previous_status', 50).nullable();
    t.string('new_status', 50).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['intervention_id', 'created_at']);
  });

  // 6. Intervention photos table
  await knex.schema.createTable('intervention_photos', (t) => {
    t.increments('id').primary();
    t.integer('intervention_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('interventions')
      .onDelete('CASCADE');
    t.integer('timeline_event_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('timeline_events')
      .onDelete('SET NULL');
    t.string('filename', 500).notNullable();
    t.string('original_name', 500).notNullable();
    t.string('mime_type', 100).notNullable();
    t.integer('size_bytes').unsigned().notNullable();
    t.integer('uploaded_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('intervention_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('intervention_photos');
  await knex.schema.dropTableIfExists('timeline_events');
  await knex.schema.alterTable('technicians', (t) => {
    t.dropForeign('current_intervention_id');
  });
  await knex.schema.dropTableIfExists('interventions');
  await knex.schema.dropTableIfExists('technicians');
  await knex.schema.dropTableIfExists('client_closure');
  await knex.schema.dropTableIfExists('clients');
}

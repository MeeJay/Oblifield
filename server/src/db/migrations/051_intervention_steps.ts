import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Step templates
  await knex.schema.createTable('step_templates', (t) => {
    t.increments('id').primary();
    t.string('name', 255).notNullable();
    t.text('description').nullable();
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamps(true, true);

    t.index('tenant_id');
  });

  // 2. Step template items (ordered steps within a template)
  await knex.schema.createTable('step_template_items', (t) => {
    t.increments('id').primary();
    t.integer('template_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('step_templates')
      .onDelete('CASCADE');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.string('label', 500).notNullable();
    t.text('description').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['template_id', 'sort_order']);
  });

  // 3. Intervention steps (instantiated from template)
  await knex.schema.createTable('intervention_steps', (t) => {
    t.increments('id').primary();
    t.integer('intervention_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('interventions')
      .onDelete('CASCADE');
    t.integer('template_item_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('step_template_items')
      .onDelete('SET NULL');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.string('label', 500).notNullable();
    t.text('description').nullable();
    t.timestamp('technician_validated_at').nullable();
    t.integer('technician_validated_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('technicians')
      .onDelete('SET NULL');
    t.timestamp('supervisor_validated_at').nullable();
    t.integer('supervisor_validated_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['intervention_id', 'sort_order']);
  });

  // 4. Add step_template_id to interventions
  await knex.schema.alterTable('interventions', (t) => {
    t.integer('step_template_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('step_templates')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('interventions', (t) => {
    t.dropForeign('step_template_id');
    t.dropColumn('step_template_id');
  });
  await knex.schema.dropTableIfExists('intervention_steps');
  await knex.schema.dropTableIfExists('step_template_items');
  await knex.schema.dropTableIfExists('step_templates');
}

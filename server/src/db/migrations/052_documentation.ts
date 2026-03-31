import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Document categories
  await knex.schema.createTable('doc_categories', (t) => {
    t.increments('id').primary();
    t.string('name', 255).notNullable();
    t.string('slug', 255).notNullable();
    t.text('description').nullable();
    t.integer('parent_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('doc_categories')
      .onDelete('CASCADE');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamps(true, true);

    t.unique(['tenant_id', 'slug']);
    t.index('parent_id');
    t.index('tenant_id');
  });

  // 2. Category closure table
  await knex.schema.createTable('doc_category_closure', (t) => {
    t.integer('ancestor_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('doc_categories')
      .onDelete('CASCADE');
    t.integer('descendant_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('doc_categories')
      .onDelete('CASCADE');
    t.integer('depth').notNullable();

    t.primary(['ancestor_id', 'descendant_id']);
    t.index('descendant_id');
    t.index('ancestor_id');
  });

  // 3. Documents
  await knex.schema.createTable('documents', (t) => {
    t.increments('id').primary();
    t.string('title', 500).notNullable();
    t.string('slug', 500).notNullable();
    t.text('content').notNullable().defaultTo('');
    t.integer('category_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('doc_categories')
      .onDelete('CASCADE');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.integer('created_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.integer('updated_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.integer('tenant_id').unsigned().notNullable();
    t.timestamps(true, true);

    t.unique(['tenant_id', 'slug']);
    t.index('category_id');
    t.index('tenant_id');
  });

  // 4. Intervention-document junction table
  await knex.schema.createTable('intervention_documents', (t) => {
    t.integer('intervention_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('interventions')
      .onDelete('CASCADE');
    t.integer('document_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('documents')
      .onDelete('CASCADE');
    t.integer('attached_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.timestamp('attached_at').notNullable().defaultTo(knex.fn.now());

    t.primary(['intervention_id', 'document_id']);
    t.index('document_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('intervention_documents');
  await knex.schema.dropTableIfExists('documents');
  await knex.schema.dropTableIfExists('doc_category_closure');
  await knex.schema.dropTableIfExists('doc_categories');
}

import type { Knex } from 'knex';

// Converts naive TIMESTAMP columns on intervention-related tables to TIMESTAMPTZ.
// Existing values are interpreted as UTC (matches what pg stored from a UTC Node process).
// After this migration, the client can send ISO UTC strings and they round-trip correctly,
// eliminating the +2h offset caused by ambiguous timezone handling.

const CONVERSIONS: Array<{ table: string; columns: string[] }> = [
  { table: 'interventions', columns: ['scheduled_at', 'due_at', 'started_at', 'completed_at', 'created_at', 'updated_at'] },
  { table: 'timeline_events', columns: ['created_at'] },
  { table: 'intervention_photos', columns: ['created_at'] },
];

export async function up(knex: Knex): Promise<void> {
  for (const { table, columns } of CONVERSIONS) {
    for (const col of columns) {
      await knex.raw(
        `ALTER TABLE ?? ALTER COLUMN ?? TYPE TIMESTAMPTZ USING ?? AT TIME ZONE 'UTC'`,
        [table, col, col],
      );
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const { table, columns } of CONVERSIONS) {
    for (const col of columns) {
      await knex.raw(
        `ALTER TABLE ?? ALTER COLUMN ?? TYPE TIMESTAMP USING ?? AT TIME ZONE 'UTC'`,
        [table, col, col],
      );
    }
  }
}

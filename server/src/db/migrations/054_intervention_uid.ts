import type { Knex } from 'knex';
import crypto from 'crypto';

function generateUid(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid ambiguity
  let uid = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    uid += chars[bytes[i] % chars.length];
  }
  return uid;
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('interventions', (t) => {
    t.string('uid', 8).nullable();
  });

  // Backfill existing rows with unique UIDs
  const rows = await knex('interventions').select('id');
  for (const row of rows) {
    let uid: string;
    let exists = true;
    do {
      uid = generateUid();
      const dup = await knex('interventions').where({ uid }).first('id');
      exists = !!dup;
    } while (exists);
    await knex('interventions').where({ id: row.id }).update({ uid });
  }

  // Now make it non-nullable and unique
  await knex.schema.alterTable('interventions', (t) => {
    t.string('uid', 8).notNullable().unique().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('interventions', (t) => {
    t.dropColumn('uid');
  });
}

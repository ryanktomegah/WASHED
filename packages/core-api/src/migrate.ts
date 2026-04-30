import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { createPgPool } from './postgres-client.js';

const databaseUrl = process.env['DATABASE_URL'];

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const pool = createPgPool(databaseUrl);
const migrationsDir = new URL('../migrations', import.meta.url);

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const alreadyApplied = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [
      file,
    ]);

    if (alreadyApplied.rowCount !== 0) {
      continue;
    }

    const sql = await readFile(join(migrationsDir.pathname, file), 'utf8');
    await pool.query('BEGIN');

    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      process.stdout.write(`Applied ${file}\n`);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await pool.end();
}

import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

const databaseUrl = process.env['DATABASE_URL'];
const describeWithDatabase = databaseUrl === undefined ? describe.skip : describe;

describeWithDatabase('core-api migrations on real Postgres', () => {
  it('replays from empty schema and enforces country RLS for app roles', async () => {
    if (databaseUrl === undefined) {
      throw new Error('DATABASE_URL is required for this integration test.');
    }

    const pool = new Pool({ connectionString: databaseUrl });
    const schemaName = `migration_replay_${randomUUID().replace(/-/gu, '')}`;
    const roleName = `migration_rls_${randomUUID().replace(/-/gu, '')}`;
    const migrationsDir = new URL('../migrations', import.meta.url);

    try {
      await pool.query(`CREATE SCHEMA ${schemaName}`);
      await pool.query(`
        CREATE TABLE ${schemaName}.schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      const migrationFiles = (await readdir(migrationsDir))
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        const sql = await readFile(join(migrationsDir.pathname, file), 'utf8');
        const client = await pool.connect();

        try {
          await client.query('BEGIN');
          await client.query(`SET LOCAL search_path TO ${schemaName}, public`);
          await client.query(sql);
          await client.query(`INSERT INTO ${schemaName}.schema_migrations (version) VALUES ($1)`, [
            file,
          ]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      const migrations = await pool.query<{ readonly count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${schemaName}.schema_migrations`,
      );
      expect(Number(migrations.rows[0]?.count)).toBe(migrationFiles.length);

      const foundationalTables = await pool.query<{ readonly table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_name IN (
              'data_retention_policies',
              'service_cells',
              'subscriber_privacy_requests',
              'worker_service_cells'
            )
          ORDER BY table_name
        `,
        [schemaName],
      );
      expect(foundationalTables.rows.map((row) => row.table_name)).toEqual([
        'data_retention_policies',
        'service_cells',
        'subscriber_privacy_requests',
        'worker_service_cells',
      ]);

      const rlsTables = await pool.query<{ readonly relname: string }>(
        `
          SELECT class.relname
          FROM pg_class class
          INNER JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
          WHERE namespace.nspname = $1
            AND class.relname IN ('subscribers', 'payment_attempts', 'subscriber_privacy_requests')
            AND class.relrowsecurity = true
          ORDER BY class.relname
        `,
        [schemaName],
      );
      expect(rlsTables.rows.map((row) => row.relname)).toEqual([
        'payment_attempts',
        'subscriber_privacy_requests',
        'subscribers',
      ]);

      await pool.query(`CREATE ROLE ${roleName} LOGIN`);
      await pool.query(`GRANT USAGE ON SCHEMA ${schemaName} TO ${roleName}`);
      await pool.query(`GRANT SELECT ON ${schemaName}.subscribers TO ${roleName}`);
      await pool.query(`
        INSERT INTO ${schemaName}.subscribers (id, country_code, locale, phone_number)
        VALUES
          ('11111111-1111-4111-8111-111111111111', 'TG', 'fr', '+22890123456'),
          ('22222222-2222-4222-8222-222222222222', 'BJ', 'fr', '+22990123456')
      `);

      const rlsClient = await pool.connect();

      try {
        await rlsClient.query('BEGIN');
        await rlsClient.query(`SET LOCAL ROLE ${roleName}`);
        await rlsClient.query(`SET LOCAL search_path TO ${schemaName}, public`);
        await rlsClient.query('SELECT set_config($1, $2, true)', ['app.country_code', 'TG']);
        const rows = await rlsClient.query<{ readonly phone_number: string }>(
          'SELECT phone_number FROM subscribers ORDER BY phone_number',
        );
        await rlsClient.query('COMMIT');
        expect(rows.rows.map((row) => row.phone_number)).toEqual(['+22890123456']);
      } catch (error) {
        await rlsClient.query('ROLLBACK');
        throw error;
      } finally {
        rlsClient.release();
      }
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      await pool.query(`DROP ROLE IF EXISTS ${roleName}`);
      await pool.end();
    }
  });
});

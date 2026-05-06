import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { backfillSensitiveDataProtection } from './data-protection-backfill.js';
import { createDataProtector } from './data-protection.js';

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

      const protectedColumns = await pool.query<{ readonly column_name: string }>(
        `
          SELECT table_name || '.' || column_name AS column_name
          FROM information_schema.columns
          WHERE table_schema = $1
            AND (
              (table_name = 'subscribers' AND column_name IN (
                'email_lookup_hash',
                'phone_number_lookup_hash'
              ))
              OR (table_name = 'auth_users' AND column_name = 'phone_number_lookup_hash')
              OR (table_name = 'auth_otp_challenges' AND column_name = 'phone_number_lookup_hash')
              OR (table_name = 'subscriber_addresses' AND column_name IN (
                'gps_latitude_ciphertext',
                'gps_longitude_ciphertext'
              ))
              OR (table_name = 'subscriptions' AND column_name = 'payment_method_phone_number_lookup_hash')
              OR (table_name = 'push_device_tokens' AND column_name = 'device_id_lookup_hash')
            )
          ORDER BY table_name, column_name
        `,
        [schemaName],
      );
      expect(protectedColumns.rows.map((row) => row.column_name)).toEqual([
        'auth_otp_challenges.phone_number_lookup_hash',
        'auth_users.phone_number_lookup_hash',
        'push_device_tokens.device_id_lookup_hash',
        'subscriber_addresses.gps_latitude_ciphertext',
        'subscriber_addresses.gps_longitude_ciphertext',
        'subscribers.email_lookup_hash',
        'subscribers.phone_number_lookup_hash',
        'subscriptions.payment_method_phone_number_lookup_hash',
      ]);

      const privacyReasonConstraint = await pool.query<{ readonly count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM information_schema.check_constraints check_constraint
          INNER JOIN information_schema.constraint_column_usage constraint_column
            ON constraint_column.constraint_name = check_constraint.constraint_name
            AND constraint_column.constraint_schema = check_constraint.constraint_schema
          WHERE constraint_column.table_schema = $1
            AND constraint_column.table_name = 'subscriber_privacy_requests'
            AND check_constraint.constraint_name = 'subscriber_privacy_requests_reason_length'
        `,
        [schemaName],
      );
      expect(privacyReasonConstraint.rows[0]?.count).toBe('0');

      const scopedPool = new Pool({
        connectionString: databaseUrl,
        options: `-c search_path=${schemaName},public`,
      });
      const dataProtector = createDataProtector({
        keyId: 'migration-test',
        masterKey: Buffer.alloc(32, 9),
      });
      const subscriberId = randomUUID();
      const eventId = randomUUID();
      const legacyClient = await scopedPool.connect();

      try {
        await legacyClient.query('BEGIN');
        await legacyClient.query('SELECT set_config($1, $2, true)', ['app.country_code', 'TG']);
        await legacyClient.query(
          `
            INSERT INTO subscribers (id, country_code, locale, phone_number)
            VALUES ($1, 'TG', 'fr', $2)
          `,
          [subscriberId, '+22890123456'],
        );
        await legacyClient.query(
          `
            INSERT INTO audit_events (
              id,
              country_code,
              aggregate_type,
              aggregate_id,
              event_type,
              payload,
              actor_role,
              actor_user_id,
              trace_id,
              occurred_at
            )
            VALUES ($1, 'TG', 'subscription', $2, 'SubscriptionCreated', $3::jsonb, 'subscriber', $2, 'trace_backfill', now())
          `,
          [
            eventId,
            subscriberId,
            JSON.stringify({ phoneNumber: '+22890123456', tierCode: 'T1' }),
          ],
        );
        await legacyClient.query('COMMIT');
      } catch (error) {
        await legacyClient.query('ROLLBACK');
        throw error;
      } finally {
        legacyClient.release();
      }

      await backfillSensitiveDataProtection(scopedPool, dataProtector);

      const backfillClient = await scopedPool.connect();
      try {
        await backfillClient.query('BEGIN');
        await backfillClient.query('SELECT set_config($1, $2, true)', ['app.country_code', 'TG']);
        const subscriber = await backfillClient.query<{
          readonly phone_number: string;
          readonly phone_number_lookup_hash: string | null;
        }>(
          `
            SELECT phone_number, phone_number_lookup_hash
            FROM subscribers
            WHERE id = $1
          `,
          [subscriberId],
        );
        const auditEvent = await backfillClient.query<{ readonly payload: Record<string, unknown> }>(
          `
            SELECT payload
            FROM audit_events
            WHERE id = $1
          `,
          [eventId],
        );
        await backfillClient.query('COMMIT');

        expect(subscriber.rows[0]?.phone_number).toContain('wdp:v1:migration-test');
        expect(subscriber.rows[0]?.phone_number).not.toContain('+22890123456');
        expect(subscriber.rows[0]?.phone_number_lookup_hash).toBe(
          dataProtector.lookupHash('TG:+22890123456', 'phone_number'),
        );
        expect(
          dataProtector.revealText(
            subscriber.rows[0]?.phone_number ?? '',
            'subscribers.phone_number',
          ),
        ).toBe('+22890123456');
        expect(JSON.stringify(auditEvent.rows[0]?.payload)).not.toContain('+22890123456');
        expect(dataProtector.revealJson(auditEvent.rows[0]?.payload ?? {}, 'audit_events.payload'))
          .toEqual({
            phoneNumber: '+22890123456',
            tierCode: 'T1',
          });
      } catch (error) {
        await backfillClient.query('ROLLBACK');
        throw error;
      } finally {
        backfillClient.release();
        await scopedPool.end();
      }

      const rlsTables = await pool.query<{
        readonly relforcerowsecurity: boolean;
        readonly relname: string;
        readonly relrowsecurity: boolean;
      }>(
        `
          SELECT class.relname, class.relrowsecurity, class.relforcerowsecurity
          FROM pg_class class
          INNER JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
          WHERE namespace.nspname = $1
            AND class.relname IN (
              'audit_events',
              'auth_sessions',
              'auth_otp_challenges',
              'auth_users',
              'data_retention_policies',
              'notification_messages',
              'outbox_events',
              'payment_attempts',
              'payment_reconciliation_runs',
              'payment_refunds',
              'push_device_tokens',
              'service_cells',
              'subscriber_addresses',
              'subscriber_privacy_requests',
              'subscribers',
              'subscriptions',
              'support_contacts',
              'support_credits',
              'support_disputes',
              'visit_photos',
              'visit_ratings',
              'visits',
              'worker_advance_requests',
              'worker_earning_ledger',
              'worker_issue_reports',
              'worker_onboarding_cases',
              'worker_onboarding_notes',
              'worker_payouts',
              'worker_service_cells',
              'worker_swap_requests',
              'worker_unavailability',
              'workers'
            )
          ORDER BY class.relname
        `,
        [schemaName],
      );
      expect(rlsTables.rows).toHaveLength(32);
      expect(rlsTables.rows.every((row) => row.relrowsecurity)).toBe(true);
      expect(rlsTables.rows.every((row) => row.relforcerowsecurity)).toBe(true);

      await pool.query(`CREATE ROLE ${roleName} LOGIN`);
      await pool.query(`GRANT USAGE ON SCHEMA ${schemaName} TO ${roleName}`);
      await pool.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ${schemaName}.subscribers TO ${roleName}`,
      );

      await pool.query('BEGIN');
      await pool.query(`SET LOCAL search_path TO ${schemaName}, public`);
      await pool.query('SELECT set_config($1, $2, true)', ['app.country_code', 'TG']);
      await pool.query(`
        INSERT INTO subscribers (id, country_code, locale, phone_number)
        VALUES ('11111111-1111-4111-8111-111111111111', 'TG', 'fr', '+22890123456')
      `);
      await pool.query('COMMIT');

      await pool.query('BEGIN');
      await pool.query(`SET LOCAL search_path TO ${schemaName}, public`);
      await pool.query('SELECT set_config($1, $2, true)', ['app.country_code', 'BJ']);
      await pool.query(`
        INSERT INTO subscribers (id, country_code, locale, phone_number)
        VALUES ('22222222-2222-4222-8222-222222222222', 'BJ', 'fr', '+22990123456')
      `);
      await pool.query('COMMIT');

      const rlsClient = await pool.connect();

      try {
        await rlsClient.query('BEGIN');
        await rlsClient.query(`SET LOCAL ROLE ${roleName}`);
        await rlsClient.query(`SET LOCAL search_path TO ${schemaName}, public`);
        const rowsWithoutCountry = await rlsClient.query<{ readonly phone_number: string }>(
          'SELECT phone_number FROM subscribers ORDER BY phone_number',
        );
        expect(rowsWithoutCountry.rows).toEqual([]);

        await rlsClient.query('SELECT set_config($1, $2, true)', ['app.country_code', 'TG']);
        const rows = await rlsClient.query<{ readonly phone_number: string }>(
          'SELECT phone_number FROM subscribers ORDER BY phone_number',
        );
        await rlsClient.query('COMMIT');
        expect(rows.rows.map((row) => row.phone_number)).toEqual(['+22890123456']);

        await rlsClient.query('BEGIN');
        await rlsClient.query(`SET LOCAL ROLE ${roleName}`);
        await rlsClient.query(`SET LOCAL search_path TO ${schemaName}, public`);
        await rlsClient.query('SELECT set_config($1, $2, true)', ['app.country_code', 'TG']);
        await expect(
          rlsClient.query(`
            INSERT INTO subscribers (id, country_code, locale, phone_number)
            VALUES ('33333333-3333-4333-8333-333333333333', 'BJ', 'fr', '+22999123456')
          `),
        ).rejects.toThrow(/row-level security/u);
        await rlsClient.query('ROLLBACK');
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
  }, 120_000);
});

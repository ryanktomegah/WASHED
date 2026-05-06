import type { CountryCode } from '@washed/shared';

import { isProtectedJson, isProtectedText, type DataProtector } from './data-protection.js';
import {
  setPgLocalCountryCode,
  type PgClient,
  type PgPoolLike,
  type PgTransactionClient,
} from './postgres-client.js';

const BACKFILL_COUNTRY_CODE: CountryCode = 'TG';

interface TextColumnSpec {
  readonly column: string;
  readonly context: string;
}

export async function backfillSensitiveDataProtection(
  pool: PgPoolLike,
  dataProtector: DataProtector,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await setPgLocalCountryCode(client, BACKFILL_COUNTRY_CODE);

    if (!(await hasColumn(client, 'subscribers', 'phone_number_lookup_hash'))) {
      await client.query('COMMIT');
      return;
    }

    await backfillSubscribers(client, dataProtector);
    await backfillAuthUsers(client, dataProtector);
    await backfillAuthOtpChallenges(client, dataProtector);
    await backfillAuthSessions(client, dataProtector);
    await backfillWorkerOnboardingCases(client, dataProtector);
    await backfillSubscriberAddresses(client, dataProtector);
    await backfillVisitCoordinates(client, dataProtector);
    await backfillSubscriptions(client, dataProtector);
    await backfillPushDeviceTokens(client, dataProtector);
    await backfillOperationalText(client, dataProtector);
    await backfillProtectedJson(client, dataProtector);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function backfillSubscribers(client: PgClient, dataProtector: DataProtector): Promise<void> {
  const result = await client.query<{
    readonly avatar_object_key: string | null;
    readonly country_code: CountryCode;
    readonly email: string | null;
    readonly email_lookup_hash: string | null;
    readonly first_name: string | null;
    readonly id: string;
    readonly last_name: string | null;
    readonly phone_number: string;
    readonly phone_number_lookup_hash: string | null;
  }>(
    `
      SELECT
        id,
        country_code,
        phone_number,
        phone_number_lookup_hash,
        first_name,
        last_name,
        email,
        email_lookup_hash,
        avatar_object_key
      FROM subscribers
      ORDER BY id ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const phoneNumber = dataProtector.revealText(row.phone_number, 'subscribers.phone_number');
    const email =
      row.email === null ? null : dataProtector.revealText(row.email, 'subscribers.email');

    await client.query(
      `
        UPDATE subscribers
        SET
          phone_number = $1,
          phone_number_lookup_hash = $2,
          first_name = $3,
          last_name = $4,
          email = $5,
          email_lookup_hash = $6,
          avatar_object_key = $7,
          updated_at = now()
        WHERE id = $8
      `,
      [
        protectExistingText(dataProtector, row.phone_number, 'subscribers.phone_number'),
        phoneLookupHash(dataProtector, row.country_code, phoneNumber),
        protectNullableExistingText(dataProtector, row.first_name, 'subscribers.first_name'),
        protectNullableExistingText(dataProtector, row.last_name, 'subscribers.last_name'),
        protectNullableExistingText(dataProtector, row.email, 'subscribers.email'),
        email === null ? null : emailLookupHash(dataProtector, row.country_code, email),
        protectNullableExistingText(
          dataProtector,
          row.avatar_object_key,
          'subscribers.avatar_object_key',
        ),
        row.id,
      ],
    );
  }
}

async function backfillAuthUsers(client: PgClient, dataProtector: DataProtector): Promise<void> {
  const result = await client.query<{
    readonly country_code: CountryCode;
    readonly id: string;
    readonly phone_number: string;
  }>(
    `
      SELECT id, country_code, phone_number
      FROM auth_users
      ORDER BY id ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const phoneNumber = dataProtector.revealText(row.phone_number, 'auth_users.phone_number');

    await client.query(
      `
        UPDATE auth_users
        SET
          phone_number = $1,
          phone_number_lookup_hash = $2,
          updated_at = now()
        WHERE id = $3
      `,
      [
        protectExistingText(dataProtector, row.phone_number, 'auth_users.phone_number'),
        phoneLookupHash(dataProtector, row.country_code, phoneNumber),
        row.id,
      ],
    );
  }
}

async function backfillAuthOtpChallenges(
  client: PgClient,
  dataProtector: DataProtector,
): Promise<void> {
  const result = await client.query<{
    readonly country_code: CountryCode;
    readonly id: string;
    readonly phone_number: string;
  }>(
    `
      SELECT id, country_code, phone_number
      FROM auth_otp_challenges
      ORDER BY created_at ASC, id ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const phoneNumber = dataProtector.revealText(
      row.phone_number,
      'auth_otp_challenges.phone_number',
    );

    await client.query(
      `
        UPDATE auth_otp_challenges
        SET
          phone_number = $1,
          phone_number_lookup_hash = $2
        WHERE id = $3
      `,
      [
        protectExistingText(dataProtector, row.phone_number, 'auth_otp_challenges.phone_number'),
        phoneLookupHash(dataProtector, row.country_code, phoneNumber),
        row.id,
      ],
    );
  }
}

async function backfillAuthSessions(client: PgClient, dataProtector: DataProtector): Promise<void> {
  await backfillTextTable(client, dataProtector, 'auth_sessions', 'id', [
    { column: 'device_id', context: 'auth_sessions.device_id' },
  ]);
}

async function backfillWorkerOnboardingCases(
  client: PgClient,
  dataProtector: DataProtector,
): Promise<void> {
  const result = await client.query<{
    readonly country_code: CountryCode;
    readonly id: string;
    readonly phone_number: string;
  }>(
    `
      SELECT id, country_code, phone_number
      FROM worker_onboarding_cases
      ORDER BY id ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const phoneNumber = dataProtector.revealText(
      row.phone_number,
      'worker_onboarding_cases.phone_number',
    );

    await client.query(
      `
        UPDATE worker_onboarding_cases
        SET
          phone_number = $1,
          phone_number_lookup_hash = $2,
          updated_at = now()
        WHERE id = $3
      `,
      [
        protectExistingText(
          dataProtector,
          row.phone_number,
          'worker_onboarding_cases.phone_number',
        ),
        phoneLookupHash(dataProtector, row.country_code, phoneNumber),
        row.id,
      ],
    );
  }
}

async function backfillSubscriberAddresses(
  client: PgClient,
  dataProtector: DataProtector,
): Promise<void> {
  const result = await client.query<{
    readonly gps_latitude: string;
    readonly gps_latitude_ciphertext: string | null;
    readonly gps_longitude: string;
    readonly gps_longitude_ciphertext: string | null;
    readonly id: string;
    readonly landmark: string;
  }>(
    `
      SELECT
        id,
        landmark,
        gps_latitude::text AS gps_latitude,
        gps_latitude_ciphertext,
        gps_longitude::text AS gps_longitude,
        gps_longitude_ciphertext
      FROM subscriber_addresses
      ORDER BY id ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const latitude = revealExistingCoordinate(
      dataProtector,
      row.gps_latitude_ciphertext,
      row.gps_latitude,
      'subscriber_addresses.gps_latitude',
    );
    const longitude = revealExistingCoordinate(
      dataProtector,
      row.gps_longitude_ciphertext,
      row.gps_longitude,
      'subscriber_addresses.gps_longitude',
    );

    await client.query(
      `
        UPDATE subscriber_addresses
        SET
          landmark = $1,
          gps_latitude = $2,
          gps_latitude_ciphertext = $3,
          gps_longitude = $4,
          gps_longitude_ciphertext = $5
        WHERE id = $6
      `,
      [
        protectExistingText(dataProtector, row.landmark, 'subscriber_addresses.landmark'),
        coarseCoordinate(latitude),
        protectExistingCoordinate(
          dataProtector,
          row.gps_latitude_ciphertext,
          latitude,
          'subscriber_addresses.gps_latitude',
        ),
        coarseCoordinate(longitude),
        protectExistingCoordinate(
          dataProtector,
          row.gps_longitude_ciphertext,
          longitude,
          'subscriber_addresses.gps_longitude',
        ),
        row.id,
      ],
    );
  }
}

async function backfillVisitCoordinates(
  client: PgClient,
  dataProtector: DataProtector,
): Promise<void> {
  const result = await client.query<{
    readonly check_in_latitude: string | null;
    readonly check_in_latitude_ciphertext: string | null;
    readonly check_in_longitude: string | null;
    readonly check_in_longitude_ciphertext: string | null;
    readonly check_out_latitude: string | null;
    readonly check_out_latitude_ciphertext: string | null;
    readonly check_out_longitude: string | null;
    readonly check_out_longitude_ciphertext: string | null;
    readonly id: string;
  }>(
    `
      SELECT
        id,
        check_in_latitude::text,
        check_in_latitude_ciphertext,
        check_in_longitude::text,
        check_in_longitude_ciphertext,
        check_out_latitude::text,
        check_out_latitude_ciphertext,
        check_out_longitude::text,
        check_out_longitude_ciphertext
      FROM visits
      ORDER BY id ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const checkInLatitude = revealNullableExistingCoordinate(
      dataProtector,
      row.check_in_latitude_ciphertext,
      row.check_in_latitude,
      'visits.check_in_latitude',
    );
    const checkInLongitude = revealNullableExistingCoordinate(
      dataProtector,
      row.check_in_longitude_ciphertext,
      row.check_in_longitude,
      'visits.check_in_longitude',
    );
    const checkOutLatitude = revealNullableExistingCoordinate(
      dataProtector,
      row.check_out_latitude_ciphertext,
      row.check_out_latitude,
      'visits.check_out_latitude',
    );
    const checkOutLongitude = revealNullableExistingCoordinate(
      dataProtector,
      row.check_out_longitude_ciphertext,
      row.check_out_longitude,
      'visits.check_out_longitude',
    );

    await client.query(
      `
        UPDATE visits
        SET
          check_in_latitude = $1,
          check_in_latitude_ciphertext = $2,
          check_in_longitude = $3,
          check_in_longitude_ciphertext = $4,
          check_out_latitude = $5,
          check_out_latitude_ciphertext = $6,
          check_out_longitude = $7,
          check_out_longitude_ciphertext = $8,
          updated_at = now()
        WHERE id = $9
      `,
      [
        checkInLatitude === null ? null : coarseCoordinate(checkInLatitude),
        protectNullableExistingCoordinate(
          dataProtector,
          row.check_in_latitude_ciphertext,
          checkInLatitude,
          'visits.check_in_latitude',
        ),
        checkInLongitude === null ? null : coarseCoordinate(checkInLongitude),
        protectNullableExistingCoordinate(
          dataProtector,
          row.check_in_longitude_ciphertext,
          checkInLongitude,
          'visits.check_in_longitude',
        ),
        checkOutLatitude === null ? null : coarseCoordinate(checkOutLatitude),
        protectNullableExistingCoordinate(
          dataProtector,
          row.check_out_latitude_ciphertext,
          checkOutLatitude,
          'visits.check_out_latitude',
        ),
        checkOutLongitude === null ? null : coarseCoordinate(checkOutLongitude),
        protectNullableExistingCoordinate(
          dataProtector,
          row.check_out_longitude_ciphertext,
          checkOutLongitude,
          'visits.check_out_longitude',
        ),
        row.id,
      ],
    );
  }
}

async function backfillSubscriptions(client: PgClient, dataProtector: DataProtector): Promise<void> {
  const result = await client.query<{
    readonly country_code: CountryCode;
    readonly id: string;
    readonly payment_method_phone_number: string | null;
  }>(
    `
      SELECT id, country_code, payment_method_phone_number
      FROM subscriptions
      ORDER BY id ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const phoneNumber =
      row.payment_method_phone_number === null
        ? null
        : dataProtector.revealText(
            row.payment_method_phone_number,
            'subscriptions.payment_method_phone_number',
          );

    await client.query(
      `
        UPDATE subscriptions
        SET
          payment_method_phone_number = $1,
          payment_method_phone_number_lookup_hash = $2,
          updated_at = now()
        WHERE id = $3
      `,
      [
        protectNullableExistingText(
          dataProtector,
          row.payment_method_phone_number,
          'subscriptions.payment_method_phone_number',
        ),
        phoneNumber === null ? null : phoneLookupHash(dataProtector, row.country_code, phoneNumber),
        row.id,
      ],
    );
  }
}

async function backfillPushDeviceTokens(
  client: PgClient,
  dataProtector: DataProtector,
): Promise<void> {
  const result = await client.query<{
    readonly device_id: string;
    readonly id: string;
    readonly token: string;
    readonly user_id: string;
  }>(
    `
      SELECT id, user_id, device_id, token
      FROM push_device_tokens
      ORDER BY id ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const deviceId = dataProtector.revealText(row.device_id, 'push_device_tokens.device_id');

    await client.query(
      `
        UPDATE push_device_tokens
        SET
          device_id = $1,
          device_id_lookup_hash = $2,
          token = $3,
          updated_at = now()
        WHERE id = $4
      `,
      [
        protectExistingText(dataProtector, row.device_id, 'push_device_tokens.device_id'),
        pushDeviceLookupHash(dataProtector, row.user_id, deviceId),
        protectExistingText(dataProtector, row.token, 'push_device_tokens.token'),
        row.id,
      ],
    );
  }
}

async function backfillOperationalText(
  client: PgClient,
  dataProtector: DataProtector,
): Promise<void> {
  await backfillTextTable(client, dataProtector, 'worker_onboarding_notes', 'id', [
    { column: 'note', context: 'worker_onboarding_notes.note' },
  ]);
  await backfillTextTable(client, dataProtector, 'worker_unavailability', 'id', [
    { column: 'reason', context: 'worker_unavailability.reason' },
  ]);
  await backfillTextTable(client, dataProtector, 'worker_swap_requests', 'id', [
    { column: 'reason', context: 'worker_swap_requests.reason' },
    { column: 'resolution_note', context: 'worker_swap_requests.resolution_note' },
  ]);
  await backfillTextTable(client, dataProtector, 'worker_advance_requests', 'id', [
    { column: 'reason', context: 'worker_advance_requests.reason' },
    { column: 'resolution_note', context: 'worker_advance_requests.resolution_note' },
  ]);
  await backfillTextTable(client, dataProtector, 'worker_payouts', 'id', [
    { column: 'failure_reason', context: 'worker_payouts.failure_reason' },
    { column: 'note', context: 'worker_payouts.note' },
  ]);
  await backfillTextTable(client, dataProtector, 'payment_refunds', 'id', [
    { column: 'reason', context: 'payment_refunds.reason' },
  ]);
  await backfillTextTable(client, dataProtector, 'support_credits', 'id', [
    { column: 'reason', context: 'support_credits.reason' },
  ]);
  await backfillTextTable(client, dataProtector, 'support_disputes', 'id', [
    { column: 'description', context: 'support_disputes.description' },
    { column: 'resolution_note', context: 'support_disputes.resolution_note' },
  ]);
  await backfillTextTable(client, dataProtector, 'support_contacts', 'id', [
    { column: 'subject', context: 'support_contacts.subject' },
    { column: 'body', context: 'support_contacts.body' },
    { column: 'resolution_note', context: 'support_contacts.resolution_note' },
  ]);
  await backfillTextTable(client, dataProtector, 'worker_issue_reports', 'id', [
    { column: 'description', context: 'worker_issue_reports.description' },
    { column: 'resolution_note', context: 'worker_issue_reports.resolution_note' },
  ]);
  await backfillTextTable(client, dataProtector, 'visit_photos', 'id', [
    { column: 'object_key', context: 'visit_photos.object_key' },
  ]);
  await backfillTextTable(client, dataProtector, 'visit_ratings', 'id', [
    { column: 'comment', context: 'visit_ratings.comment' },
  ]);
  await backfillTextTable(client, dataProtector, 'subscriber_privacy_requests', 'id', [
    { column: 'reason', context: 'subscriber_privacy_requests.reason' },
  ]);
  await backfillTextTable(client, dataProtector, 'notification_messages', 'id', [
    { column: 'failure_reason', context: 'notification_messages.failure_reason' },
  ]);
}

async function backfillProtectedJson(
  client: PgTransactionClient,
  dataProtector: DataProtector,
): Promise<void> {
  await client.query('ALTER TABLE audit_events DISABLE TRIGGER audit_events_no_update');
  try {
    await backfillJsonTable(client, dataProtector, 'audit_events', 'id', [
      { column: 'payload', context: 'audit_events.payload' },
    ]);
  } finally {
    await client.query('ALTER TABLE audit_events ENABLE TRIGGER audit_events_no_update');
  }

  await backfillJsonTable(client, dataProtector, 'outbox_events', 'id', [
    { column: 'payload', context: 'outbox_events.payload' },
  ]);
  await backfillJsonTable(client, dataProtector, 'notification_messages', 'id', [
    { column: 'payload', context: 'notification_messages.payload' },
  ]);
  await backfillJsonTable(client, dataProtector, 'subscriber_privacy_requests', 'id', [
    { column: 'export_bundle', context: 'subscriber_privacy_requests.export_bundle' },
    { column: 'erasure_plan', context: 'subscriber_privacy_requests.erasure_plan' },
  ]);
}

async function backfillTextTable(
  client: PgClient,
  dataProtector: DataProtector,
  tableName: string,
  idColumn: string,
  columns: readonly TextColumnSpec[],
): Promise<void> {
  const selectedColumns = columns.map((column) => column.column).join(', ');
  const result = await client.query(
    `
      SELECT ${idColumn} AS backfill_id, ${selectedColumns}
      FROM ${tableName}
      ORDER BY ${idColumn} ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const values: unknown[] = [];
    const assignments = columns.map((column, index) => {
      values.push(
        protectNullableExistingText(
          dataProtector,
          row[column.column] as string | null,
          column.context,
        ),
      );
      return `${column.column} = $${index + 1}`;
    });
    values.push(row['backfill_id']);

    await client.query(
      `
        UPDATE ${tableName}
        SET ${assignments.join(', ')}
        WHERE ${idColumn} = $${values.length}
      `,
      values,
    );
  }
}

async function backfillJsonTable(
  client: PgClient,
  dataProtector: DataProtector,
  tableName: string,
  idColumn: string,
  columns: readonly TextColumnSpec[],
): Promise<void> {
  const selectedColumns = columns.map((column) => column.column).join(', ');
  const result = await client.query(
    `
      SELECT ${idColumn} AS backfill_id, ${selectedColumns}
      FROM ${tableName}
      ORDER BY ${idColumn} ASC
      FOR UPDATE
    `,
  );

  for (const row of result.rows) {
    const values: unknown[] = [];
    const assignments = columns.map((column, index) => {
      values.push(
        stringifyJsonForPostgres(
          protectExistingJson(dataProtector, row[column.column], column.context),
        ),
      );
      return `${column.column} = $${index + 1}::jsonb`;
    });
    values.push(row['backfill_id']);

    await client.query(
      `
        UPDATE ${tableName}
        SET ${assignments.join(', ')}
        WHERE ${idColumn} = $${values.length}
      `,
      values,
    );
  }
}

async function hasColumn(client: PgClient, tableName: string, columnName: string): Promise<boolean> {
  const result = await client.query<{ readonly exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
          AND column_name = $2
      ) AS exists
    `,
    [tableName, columnName],
  );

  return result.rows[0]?.exists ?? false;
}

function protectExistingText(
  dataProtector: DataProtector,
  value: string,
  context: string,
): string {
  return isProtectedText(value) ? value : dataProtector.protectText(value, context);
}

function protectNullableExistingText(
  dataProtector: DataProtector,
  value: string | null,
  context: string,
): string | null {
  return value === null ? null : protectExistingText(dataProtector, value, context);
}

function protectExistingJson(
  dataProtector: DataProtector,
  value: unknown,
  context: string,
): Record<string, unknown> {
  return isProtectedJson(value) ? value : dataProtector.protectJson(value, context);
}

function revealExistingCoordinate(
  dataProtector: DataProtector,
  encryptedValue: string | null,
  fallbackValue: string,
  context: string,
): number {
  return encryptedValue === null
    ? Number(fallbackValue)
    : Number(dataProtector.revealText(encryptedValue, context));
}

function revealNullableExistingCoordinate(
  dataProtector: DataProtector,
  encryptedValue: string | null,
  fallbackValue: string | null,
  context: string,
): number | null {
  if (encryptedValue !== null) {
    return Number(dataProtector.revealText(encryptedValue, context));
  }

  return fallbackValue === null ? null : Number(fallbackValue);
}

function protectExistingCoordinate(
  dataProtector: DataProtector,
  encryptedValue: string | null,
  value: number,
  context: string,
): string {
  return encryptedValue === null ? protectCoordinate(dataProtector, value, context) : encryptedValue;
}

function protectNullableExistingCoordinate(
  dataProtector: DataProtector,
  encryptedValue: string | null,
  value: number | null,
  context: string,
): string | null {
  return value === null
    ? null
    : protectExistingCoordinate(dataProtector, encryptedValue, value, context);
}

function protectCoordinate(dataProtector: DataProtector, value: number, context: string): string {
  return dataProtector.protectText(value.toFixed(6), context);
}

function coarseCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function phoneLookupHash(
  dataProtector: DataProtector,
  countryCode: CountryCode,
  phoneNumber: string,
): string {
  return dataProtector.lookupHash(`${countryCode}:${phoneNumber}`, 'phone_number');
}

function emailLookupHash(
  dataProtector: DataProtector,
  countryCode: CountryCode,
  email: string,
): string {
  return dataProtector.lookupHash(`${countryCode}:${email.trim().toLocaleLowerCase('fr')}`, 'email');
}

function pushDeviceLookupHash(
  dataProtector: DataProtector,
  userId: string,
  deviceId: string,
): string {
  return dataProtector.lookupHash(`${userId}:${deviceId}`, 'push_device.device_id');
}

function stringifyJsonForPostgres(value: unknown): string {
  return JSON.stringify(value, (_key, nestedValue: unknown) =>
    typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue,
  );
}

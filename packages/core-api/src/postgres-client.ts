import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

import type { CountryCode } from '@washed/shared';

export interface PgClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<T>>;
}

export interface PgTransactionClient extends PgClient {
  release(): void;
}

export interface PgPoolLike extends PgClient {
  connect(): Promise<PgTransactionClient>;
  end(): Promise<void>;
}

export function createPgPool(connectionString: string): PgPoolLike {
  return new Pool({ connectionString }) as PgPoolLike;
}

export function asPgTransactionClient(client: PoolClient): PgTransactionClient {
  return client;
}

export async function setPgLocalCountryCode(
  client: PgClient,
  countryCode: CountryCode,
): Promise<void> {
  await client.query('SELECT set_config($1, $2, true)', ['app.country_code', countryCode]);
}

export async function withPgTransaction<T>(
  pool: PgPoolLike,
  input: {
    readonly countryCode?: CountryCode;
    readonly run: (client: PgTransactionClient) => Promise<T>;
  },
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (input.countryCode !== undefined) {
      await setPgLocalCountryCode(client, input.countryCode);
    }

    const result = await input.run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

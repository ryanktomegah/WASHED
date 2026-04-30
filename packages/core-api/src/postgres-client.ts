import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

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

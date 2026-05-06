import { createPgPool } from './postgres-client.js';
import { PostgresCoreRepository } from './postgres-repository.js';
import { createDataProtectorFromEnv } from './data-protection.js';
import { InMemoryCoreRepository, type CoreRepository } from './repository.js';

export function createRepositoryFromEnv(env: NodeJS.ProcessEnv = process.env): CoreRepository {
  const databaseUrl = env['DATABASE_URL'];

  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    return new InMemoryCoreRepository();
  }

  return new PostgresCoreRepository(
    createPgPool(databaseUrl),
    undefined,
    undefined,
    createDataProtectorFromEnv(env),
  );
}

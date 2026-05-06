import { readFile, readdir } from 'node:fs/promises';

const migrationsDir = new URL('../packages/core-api/migrations/', import.meta.url);
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const seenVersions = new Set();

if (files.length === 0) {
  throw new Error('No core-api migrations found.');
}

for (const [index, file] of files.entries()) {
  const match = /^(?<version>\d{4})_[a-z0-9_]+\.sql$/u.exec(file);

  if (match?.groups === undefined) {
    throw new Error(`Invalid migration filename: ${file}. Expected 0001_description.sql.`);
  }

  const version = Number(match.groups.version);
  const expected = index + 1;

  if (seenVersions.has(version)) {
    throw new Error(`Duplicate migration version: ${match.groups.version}.`);
  }

  if (version !== expected) {
    throw new Error(`Migration ${file} should use version ${String(expected).padStart(4, '0')}.`);
  }

  seenVersions.add(version);

  const sql = await readFile(new URL(file, migrationsDir), 'utf8');
  assertSafeMigrationSql(file, sql);
}

process.stdout.write(`core-api migrations ok (${files.length})\n`);

function assertSafeMigrationSql(file, sql) {
  const normalized = sql.replace(/--.*$/gmu, '').replace(/\s+/gu, ' ').trim();
  const unsafePatterns = [
    { label: 'DROP TABLE', pattern: /\bDROP\s+TABLE\b/iu },
    { label: 'DROP COLUMN', pattern: /\bDROP\s+COLUMN\b/iu },
    { label: 'TRUNCATE', pattern: /\bTRUNCATE\b/iu },
    {
      label: 'CREATE INDEX CONCURRENTLY',
      pattern: /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/iu,
    },
  ];

  for (const { label, pattern } of unsafePatterns) {
    if (pattern.test(normalized)) {
      throw new Error(
        `${file} uses ${label}. Add a companion data migration and rollback note before shipping destructive schema drift.`,
      );
    }
  }
}

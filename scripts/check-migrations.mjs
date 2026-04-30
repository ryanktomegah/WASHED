import { readdir } from 'node:fs/promises';

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
}

process.stdout.write(`core-api migrations ok (${files.length})\n`);

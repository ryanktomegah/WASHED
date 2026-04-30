import { createHash } from 'node:crypto';

const KEY_PART_PATTERN = /^[A-Za-z0-9:._-]+$/u;

export function createIdempotencyKey(namespace: string, parts: readonly string[]): string {
  assertKeyPart(namespace, 'namespace');

  if (parts.length === 0) {
    throw new Error('Idempotency key requires at least one part.');
  }

  for (const [index, part] of parts.entries()) {
    assertKeyPart(part, `parts[${index}]`);
  }

  const digest = createHash('sha256').update(parts.join('\u001f')).digest('hex').slice(0, 32);
  return `${namespace}:${digest}`;
}

function assertKeyPart(value: string, label: string): void {
  if (value.length === 0) {
    throw new Error(`${label} cannot be empty.`);
  }

  if (!KEY_PART_PATTERN.test(value)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
}

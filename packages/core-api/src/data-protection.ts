import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

const ENCRYPTED_TEXT_PREFIX = 'wdp:v1';
const ENCRYPTED_JSON_MARKER = '__washedEncrypted';
const LOCAL_DEVELOPMENT_KEY_ID = 'local-dev';
const LOCAL_DEVELOPMENT_MASTER_KEY = createHash('sha256')
  .update('washed-local-development-data-protection-key')
  .digest();

export interface DataProtector {
  readonly keyId: string;
  lookupHash(value: string, context: string): string;
  protectJson(value: unknown, context: string): Record<string, unknown>;
  protectNullableText(value: string | null | undefined, context: string): string | null;
  protectText(value: string, context: string): string;
  revealJson(value: Record<string, unknown>, context: string): Record<string, unknown>;
  revealNullableText(value: string | null, context: string): string | null;
  revealText(value: string, context: string): string;
}

export function createDataProtectorFromEnv(env: NodeJS.ProcessEnv = process.env): DataProtector {
  const encodedKey = env['WASHED_DATA_ENCRYPTION_KEY'];

  if (encodedKey !== undefined && encodedKey.trim().length > 0) {
    return createDataProtector({
      keyId: env['WASHED_DATA_ENCRYPTION_KEY_ID'] ?? 'primary',
      masterKey: parseMasterKey(encodedKey),
      previousKeys: parsePreviousKeys(env['WASHED_DATA_ENCRYPTION_PREVIOUS_KEYS']),
    });
  }

  if (env['NODE_ENV'] === 'production') {
    throw new Error('WASHED_DATA_ENCRYPTION_KEY is required in production.');
  }

  if (requiresExplicitDataProtectionKey(env)) {
    throw new Error(
      'WASHED_DATA_ENCRYPTION_KEY is required for non-local DATABASE_URL values. Set WASHED_ALLOW_INSECURE_DEV_DATA_KEY=true only for disposable local drills.',
    );
  }

  return createDataProtector({
    keyId: LOCAL_DEVELOPMENT_KEY_ID,
    masterKey: LOCAL_DEVELOPMENT_MASTER_KEY,
  });
}

export function createDataProtector(input: {
  readonly keyId: string;
  readonly masterKey: Buffer;
  readonly previousKeys?: readonly {
    readonly keyId: string;
    readonly masterKey: Buffer;
  }[];
}): DataProtector {
  const currentKey = buildKeyMaterial(input.keyId, input.masterKey);
  const keysById = new Map<string, KeyMaterial>([[currentKey.keyId, currentKey]]);
  for (const previousKey of input.previousKeys ?? []) {
    const keyMaterial = buildKeyMaterial(previousKey.keyId, previousKey.masterKey);
    if (keyMaterial.keyId === currentKey.keyId) {
      throw new Error('Previous data protection keys must not reuse the current key id.');
    }
    keysById.set(keyMaterial.keyId, keyMaterial);
  }

  return {
    keyId: input.keyId,
    lookupHash(value, context) {
      return createHmac('sha256', currentKey.lookupKey)
        .update(context)
        .update('\0')
        .update(value)
        .digest('base64url');
    },
    protectJson(value, context) {
      return {
        [ENCRYPTED_JSON_MARKER]: this.protectText(stringifyJson(value), context),
      };
    },
    protectNullableText(value, context) {
      return value === undefined || value === null ? null : this.protectText(value, context);
    },
    protectText(value, context) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', currentKey.encryptionKey, iv);
      cipher.setAAD(Buffer.from(context));
      const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();

      return [
        ENCRYPTED_TEXT_PREFIX,
        currentKey.keyId,
        iv.toString('base64url'),
        ciphertext.toString('base64url'),
        tag.toString('base64url'),
      ].join(':');
    },
    revealJson(value, context) {
      const encrypted = value[ENCRYPTED_JSON_MARKER];
      if (typeof encrypted !== 'string') {
        return value;
      }

      return JSON.parse(this.revealText(encrypted, context)) as Record<string, unknown>;
    },
    revealNullableText(value, context) {
      return value === null ? null : this.revealText(value, context);
    },
    revealText(value, context) {
      if (!value.startsWith(`${ENCRYPTED_TEXT_PREFIX}:`)) {
        return value;
      }

      const parts = value.split(':');
      if (parts.length !== 6) {
        throw new Error('Encrypted value is malformed.');
      }

      const ivText = parts[3];
      const ciphertextText = parts[4];
      const tagText = parts[5];
      if (ivText === undefined || ciphertextText === undefined || tagText === undefined) {
        throw new Error('Encrypted value is malformed.');
      }
      const keyId = parts[2];
      const keyMaterial = keyId === undefined ? undefined : keysById.get(keyId);
      if (keyMaterial === undefined) {
        throw new Error(`Encrypted value references unknown data protection key id "${keyId}".`);
      }

      const decipher = createDecipheriv(
        'aes-256-gcm',
        keyMaterial.encryptionKey,
        Buffer.from(ivText, 'base64url'),
      );
      decipher.setAAD(Buffer.from(context));
      decipher.setAuthTag(Buffer.from(tagText, 'base64url'));

      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextText, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    },
  };
}

interface KeyMaterial {
  readonly encryptionKey: Buffer;
  readonly keyId: string;
  readonly lookupKey: Buffer;
}

function buildKeyMaterial(keyId: string, masterKey: Buffer): KeyMaterial {
  if (keyId.trim().length === 0 || keyId.includes(':') || keyId.includes('=')) {
    throw new Error('Data protection key id must be non-empty and must not contain ":" or "=".');
  }

  if (masterKey.length !== 32) {
    throw new Error('Data protection master key must be exactly 32 bytes.');
  }

  return {
    encryptionKey: deriveKey(masterKey, 'field-encryption'),
    keyId,
    lookupKey: deriveKey(masterKey, 'lookup-hmac'),
  };
}

function parseMasterKey(value: string): Buffer {
  const trimmed = value.trim();

  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const base64 = Buffer.from(trimmed, 'base64url');
  if (base64.length === 32) {
    return base64;
  }

  throw new Error('WASHED_DATA_ENCRYPTION_KEY must be 32 bytes encoded as base64url or hex.');
}

function parsePreviousKeys(
  value: string | undefined,
): readonly { readonly keyId: string; readonly masterKey: Buffer }[] {
  if (value === undefined || value.trim().length === 0) {
    return [];
  }

  return value.split(',').map((entry) => {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex < 1) {
      throw new Error(
        'WASHED_DATA_ENCRYPTION_PREVIOUS_KEYS must be comma-separated keyId=base64url entries.',
      );
    }
    const keyId = entry.slice(0, separatorIndex);
    const encodedKey = entry.slice(separatorIndex + 1);

    return {
      keyId,
      masterKey: parseMasterKey(encodedKey),
    };
  });
}

function deriveKey(masterKey: Buffer, purpose: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', masterKey, 'washed-core-api-data-protection-v1', purpose, 32),
  );
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, (_key, nestedValue: unknown) =>
    typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue,
  );
}

function requiresExplicitDataProtectionKey(env: NodeJS.ProcessEnv): boolean {
  if (env['WASHED_ALLOW_INSECURE_DEV_DATA_KEY'] === 'true') {
    return false;
  }

  const databaseUrl = env['DATABASE_URL'];
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(databaseUrl);
    return !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return true;
  }
}

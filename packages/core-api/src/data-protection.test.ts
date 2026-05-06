import { describe, expect, it } from 'vitest';

import { createDataProtector, createDataProtectorFromEnv } from './data-protection.js';

const masterKey = Buffer.alloc(32, 7);

describe('data protection', () => {
  it('encrypts text without storing the plaintext and decrypts with the same context', () => {
    const protector = createDataProtector({ keyId: 'test', masterKey });

    const encrypted = protector.protectText('+22890123456', 'phone_number');

    expect(encrypted).not.toContain('+22890123456');
    expect(protector.revealText(encrypted, 'phone_number')).toBe('+22890123456');
  });

  it('binds ciphertext to its storage context', () => {
    const protector = createDataProtector({ keyId: 'test', masterKey });
    const encrypted = protector.protectText('Tokoin, portail bleu', 'subscriber_addresses.landmark');

    expect(() => protector.revealText(encrypted, 'support_contacts.body')).toThrow();
  });

  it('uses deterministic keyed lookup hashes without exposing the source value', () => {
    const protector = createDataProtector({ keyId: 'test', masterKey });

    const left = protector.lookupHash('TG:+22890123456', 'phone_number');
    const right = protector.lookupHash('TG:+22890123456', 'phone_number');

    expect(left).toBe(right);
    expect(left).not.toContain('+22890123456');
  });

  it('wraps JSON payloads in an encrypted marker', () => {
    const protector = createDataProtector({ keyId: 'test', masterKey });

    const encrypted = protector.protectJson(
      { phoneNumber: '+22890123456', amountMinor: 12n },
      'audit_events.payload',
    );

    expect(JSON.stringify(encrypted)).not.toContain('+22890123456');
    expect(protector.revealJson(encrypted, 'audit_events.payload')).toEqual({
      amountMinor: '12',
      phoneNumber: '+22890123456',
    });
  });

  it('decrypts values written by a previous key id during rotation', () => {
    const previousKey = Buffer.alloc(32, 3);
    const oldProtector = createDataProtector({ keyId: 'old', masterKey: previousKey });
    const newProtector = createDataProtector({
      keyId: 'new',
      masterKey,
      previousKeys: [{ keyId: 'old', masterKey: previousKey }],
    });

    const encrypted = oldProtector.protectText('+22890123456', 'phone_number');

    expect(newProtector.revealText(encrypted, 'phone_number')).toBe('+22890123456');
  });

  it('keeps lookup hashes queryable during key rotation', () => {
    const previousKey = Buffer.alloc(32, 3);
    const oldProtector = createDataProtector({ keyId: 'old', masterKey: previousKey });
    const newProtector = createDataProtector({
      keyId: 'new',
      masterKey,
      previousKeys: [{ keyId: 'old', masterKey: previousKey }],
    });

    expect(newProtector.lookupHashes('TG:+22890123456', 'phone_number')).toEqual([
      newProtector.lookupHash('TG:+22890123456', 'phone_number'),
      oldProtector.lookupHash('TG:+22890123456', 'phone_number'),
    ]);
  });

  it('requires an explicit key for production', () => {
    expect(() => createDataProtectorFromEnv({ NODE_ENV: 'production' })).toThrow(
      /WASHED_DATA_ENCRYPTION_KEY/,
    );
  });
});

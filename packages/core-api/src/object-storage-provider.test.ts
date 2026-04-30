import { describe, expect, it } from 'vitest';

import { createObjectStorageProvider } from './object-storage-provider.js';

describe('createObjectStorageProvider', () => {
  it('uses local signed upload urls by default', async () => {
    const provider = createObjectStorageProvider({}, () => new Date('2026-05-05T09:00:00.000Z'));

    const result = await provider.createUploadUrl({
      byteSize: 128_000,
      contentType: 'image/jpeg',
      objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
      traceId: 'trace_photo_upload',
    });

    expect(result).toMatchObject({
      expiresAt: new Date('2026-05-05T09:10:00.000Z'),
      headers: { 'content-type': 'image/jpeg' },
      method: 'PUT',
      objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
      provider: 'local_signed_url',
    });
    expect(result.uploadUrl).toContain(
      '/api/local-object-storage/visits/44444444-4444-4444-8444-444444444444/before.jpg',
    );
    expect(result.uploadUrl).toContain('signature=');
  });

  it('gates S3-compatible storage until credentials and real uploads are enabled', async () => {
    const provider = createObjectStorageProvider({ OBJECT_STORAGE_PROVIDER: 's3_compatible' });

    await expect(
      provider.createUploadUrl({
        byteSize: 128_000,
        contentType: 'image/jpeg',
        objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
        traceId: 'trace_photo_upload',
      }),
    ).rejects.toThrow(
      'Object storage provider s3_compatible is not upload-capable: missing_credentials:OBJECT_STORAGE_ACCESS_KEY_ID,OBJECT_STORAGE_BUCKET,OBJECT_STORAGE_ENDPOINT,OBJECT_STORAGE_REGION,OBJECT_STORAGE_SECRET_ACCESS_KEY.',
    );
  });

  it('creates a gated S3-compatible presigned PUT target', async () => {
    const provider = createObjectStorageProvider(
      {
        OBJECT_STORAGE_ACCESS_KEY_ID: 'access-key',
        OBJECT_STORAGE_BUCKET: 'washed-evidence',
        OBJECT_STORAGE_ENDPOINT: 'https://storage.example.com',
        OBJECT_STORAGE_PROVIDER: 's3_compatible',
        OBJECT_STORAGE_REAL_UPLOAD_ENABLED: 'true',
        OBJECT_STORAGE_REGION: 'af-west-1',
        OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret-key',
      },
      () => new Date('2026-05-05T09:00:00.000Z'),
    );

    const result = await provider.createUploadUrl({
      byteSize: 128_000,
      contentType: 'image/jpeg',
      objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
      traceId: 'trace_photo_upload',
    });

    expect(result).toMatchObject({
      headers: { 'content-type': 'image/jpeg' },
      method: 'PUT',
      provider: 's3_compatible',
    });
    expect(result.uploadUrl).toContain('https://storage.example.com/washed-evidence/visits/');
    expect(result.uploadUrl).toContain('X-Amz-Signature=');
  });
});

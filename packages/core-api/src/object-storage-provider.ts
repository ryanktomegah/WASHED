import { createHmac } from 'node:crypto';

export type ObjectStorageProviderKind = 'local_signed_url' | 's3_compatible';

export interface CreateUploadUrlInput {
  readonly byteSize: number;
  readonly contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly expiresInSeconds?: number;
  readonly objectKey: string;
  readonly traceId: string;
}

export interface CreateUploadUrlResult {
  readonly expiresAt: Date;
  readonly headers: Readonly<Record<string, string>>;
  readonly method: 'PUT';
  readonly objectKey: string;
  readonly provider: ObjectStorageProviderKind;
  readonly uploadUrl: string;
}

export interface ObjectStorageProvider {
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
}

const S3_REQUIRED_KEYS = [
  'OBJECT_STORAGE_ACCESS_KEY_ID',
  'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_ENDPOINT',
  'OBJECT_STORAGE_REGION',
  'OBJECT_STORAGE_SECRET_ACCESS_KEY',
] as const;

const DEFAULT_EXPIRES_IN_SECONDS = 600;

export function createObjectStorageProvider(
  env: NodeJS.ProcessEnv = process.env,
  now: () => Date = () => new Date(),
): ObjectStorageProvider {
  const provider = readObjectStorageProvider(env['OBJECT_STORAGE_PROVIDER']);

  if (provider === 'local_signed_url') {
    return new LocalSignedUrlObjectStorageProvider(env, now);
  }

  const missingKeys = S3_REQUIRED_KEYS.filter((key) => env[key] === undefined || env[key] === '');

  if (missingKeys.length > 0) {
    return new DisabledObjectStorageProvider(
      provider,
      `missing_credentials:${missingKeys.join(',')}`,
    );
  }

  if (env['OBJECT_STORAGE_REAL_UPLOAD_ENABLED'] !== 'true') {
    return new DisabledObjectStorageProvider(provider, 'real_upload_disabled');
  }

  return new S3CompatibleObjectStorageProvider(env, now);
}

class LocalSignedUrlObjectStorageProvider implements ObjectStorageProvider {
  public constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly now: () => Date,
  ) {}

  public async createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult> {
    const expiresAt = expiresAtFor(input, this.now());
    const encodedKey = input.objectKey.split('/').map(encodeURIComponent).join('/');
    const uploadUrl =
      this.env['OBJECT_STORAGE_LOCAL_BASE_URL'] === undefined
        ? new URL(`/api/local-object-storage/${encodedKey}`, 'http://washed.local')
        : new URL(`/local-object-storage/${encodedKey}`, this.env['OBJECT_STORAGE_LOCAL_BASE_URL']);

    uploadUrl.searchParams.set('expiresAt', expiresAt.toISOString());
    uploadUrl.searchParams.set('signature', signLocalUpload(input, expiresAt, this.env));

    return {
      expiresAt,
      headers: { 'content-type': input.contentType },
      method: 'PUT',
      objectKey: input.objectKey,
      provider: 'local_signed_url',
      uploadUrl:
        this.env['OBJECT_STORAGE_LOCAL_BASE_URL'] === undefined
          ? `${uploadUrl.pathname}${uploadUrl.search}`
          : uploadUrl.toString(),
    };
  }
}

class DisabledObjectStorageProvider implements ObjectStorageProvider {
  public constructor(
    private readonly provider: ObjectStorageProviderKind,
    private readonly reason: string,
  ) {}

  public async createUploadUrl(): Promise<CreateUploadUrlResult> {
    throw new Error(
      `Object storage provider ${this.provider} is not upload-capable: ${this.reason}.`,
    );
  }
}

class S3CompatibleObjectStorageProvider implements ObjectStorageProvider {
  public constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly now: () => Date,
  ) {}

  public async createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult> {
    const expiresAt = expiresAtFor(input, this.now());
    const endpoint = requireEnv(this.env, 'OBJECT_STORAGE_ENDPOINT').replace(/\/+$/u, '');
    const bucket = requireEnv(this.env, 'OBJECT_STORAGE_BUCKET');
    const region = requireEnv(this.env, 'OBJECT_STORAGE_REGION');
    const accessKeyId = requireEnv(this.env, 'OBJECT_STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv(this.env, 'OBJECT_STORAGE_SECRET_ACCESS_KEY');
    const encodedKey = input.objectKey.split('/').map(encodeURIComponent).join('/');
    const uploadUrl = new URL(`${endpoint}/${encodeURIComponent(bucket)}/${encodedKey}`);
    uploadUrl.searchParams.set('X-Amz-Algorithm', 'WASHED-HMAC-SHA256');
    uploadUrl.searchParams.set('X-Amz-Credential', `${accessKeyId}/${region}`);
    uploadUrl.searchParams.set('X-Amz-Expires', secondsUntil(expiresAt, this.now()).toString());
    uploadUrl.searchParams.set('X-Amz-SignedHeaders', 'content-type');
    uploadUrl.searchParams.set(
      'X-Amz-Signature',
      createHmac('sha256', secretAccessKey)
        .update(
          `${input.objectKey}:${input.contentType}:${expiresAt.toISOString()}:${input.traceId}`,
        )
        .digest('hex'),
    );

    return {
      expiresAt,
      headers: { 'content-type': input.contentType },
      method: 'PUT',
      objectKey: input.objectKey,
      provider: 's3_compatible',
      uploadUrl: uploadUrl.toString(),
    };
  }
}

function expiresAtFor(input: CreateUploadUrlInput, now: Date): Date {
  return new Date(now.getTime() + (input.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS) * 1000);
}

function secondsUntil(expiresAt: Date, now: Date): number {
  return Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}

function signLocalUpload(
  input: CreateUploadUrlInput,
  expiresAt: Date,
  env: NodeJS.ProcessEnv,
): string {
  return createHmac('sha256', env['OBJECT_STORAGE_LOCAL_SECRET'] ?? 'local-object-storage-secret')
    .update(`${input.objectKey}:${input.contentType}:${input.byteSize}:${expiresAt.toISOString()}`)
    .digest('hex');
}

function readObjectStorageProvider(value: string | undefined): ObjectStorageProviderKind {
  if (value === undefined || value === 'local_signed_url') {
    return 'local_signed_url';
  }

  if (value === 's3_compatible') {
    return 's3_compatible';
  }

  throw new Error(`Unsupported object storage provider setting: ${value}.`);
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

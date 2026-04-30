import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type AuthRole = 'operator' | 'subscriber' | 'worker';

export interface AuthAccessTokenClaims {
  readonly exp: number;
  readonly phoneNumber: string;
  readonly role: AuthRole;
  readonly sessionId: string;
  readonly sub: string;
}

export interface IssuedAuthTokens {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Date;
  readonly refreshToken: string;
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export function issueAuthTokens(input: {
  readonly now?: Date;
  readonly phoneNumber: string;
  readonly role: AuthRole;
  readonly sessionId: string;
  readonly userId: string;
}): IssuedAuthTokens {
  const now = input.now ?? new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const claims: AuthAccessTokenClaims = {
    exp: Math.floor(accessTokenExpiresAt.getTime() / 1000),
    phoneNumber: input.phoneNumber,
    role: input.role,
    sessionId: input.sessionId,
    sub: input.userId,
  };

  return {
    accessToken: signToken(claims),
    accessTokenExpiresAt,
    refreshToken: randomBytes(32).toString('base64url'),
  };
}

export function verifyAccessToken(token: string): AuthAccessTokenClaims {
  const [payloadText, signature] = token.split('.');

  if (payloadText === undefined || signature === undefined) {
    throw new Error('Access token is malformed.');
  }

  const expectedSignature = sign(payloadText);

  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('Access token signature is invalid.');
  }

  const claims = JSON.parse(Buffer.from(payloadText, 'base64url').toString('utf8')) as unknown;

  if (!isAccessTokenClaims(claims)) {
    throw new Error('Access token claims are invalid.');
  }

  if (claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Access token has expired.');
  }

  return claims;
}

function signToken(claims: AuthAccessTokenClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function sign(payload: string): string {
  return createHmac('sha256', getAuthTokenSecret()).update(payload).digest('base64url');
}

function getAuthTokenSecret(): string {
  return process.env['AUTH_TOKEN_SECRET'] ?? 'washed-local-auth-token-secret';
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isAccessTokenClaims(value: unknown): value is AuthAccessTokenClaims {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['exp'] === 'number' &&
    typeof record['phoneNumber'] === 'string' &&
    isAuthRole(record['role']) &&
    typeof record['sessionId'] === 'string' &&
    typeof record['sub'] === 'string'
  );
}

export function isAuthRole(value: unknown): value is AuthRole {
  return value === 'operator' || value === 'subscriber' || value === 'worker';
}

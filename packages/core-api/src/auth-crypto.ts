import { createHash, timingSafeEqual } from 'node:crypto';

export function hashOtpCode(challengeId: string, code: string): string {
  return hash(`otp:${challengeId}:${code}`);
}

export function hashRefreshToken(refreshToken: string): string {
  return hash(`refresh:${refreshToken}`);
}

export function safeHashEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

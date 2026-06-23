import { createHash, randomBytes } from 'crypto';

export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyDeviceToken(token: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  return hashDeviceToken(token) === hash;
}

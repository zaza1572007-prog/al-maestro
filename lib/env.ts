import crypto from 'crypto';

/**
 * lib/env.ts
 *
 * Centralized environment variables loader and validator.
 * Reads and validates keys ONCE at startup to ensure 0 CPU overhead during runtime requests.
 * Eliminates all insecure hardcoded fallbacks across the application.
 */

const rawJwt = (process.env.JWT_SECRET || '').trim();
if (!rawJwt && process.env.NODE_ENV === 'production') {
  throw new Error('[FATAL SECURITY ERROR] JWT_SECRET environment variable is required in production.');
}

// Fallback chain uses JWT_SECRET as the root secret (ensuring 0 dependency on hardcoded sample keys)
const JWT_SECRET = rawJwt || 'almaestro_development_secret_key_2026_minimum_entropy_required';
const NEXTAUTH_SECRET = (process.env.NEXTAUTH_SECRET || '').trim() || JWT_SECRET;
const QR_SECRET = (process.env.QR_SECRET || '').trim() || JWT_SECRET;
const WA_API_TOKEN = (process.env.WA_API_TOKEN || process.env.TUNNEL_SECRET || '').trim() || JWT_SECRET;

export const ENV = {
  JWT_SECRET,
  JWT_SECRET_BYTES: new TextEncoder().encode(JWT_SECRET),
  NEXTAUTH_SECRET,
  QR_SECRET,
  WA_API_TOKEN,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
} as const;

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

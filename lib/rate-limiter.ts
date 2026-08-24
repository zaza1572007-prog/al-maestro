/**
 * In-memory sliding window rate-limiter for Next.js middleware and API routes.
 * Supports granular tiering: STRICT (Auth/Password/WhatsApp) vs TURBO (Scan/Attendance).
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const ratesStore = new Map<string, RateLimitStore>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ratesStore.entries()) {
    if (now > record.resetTime) {
      ratesStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export type RateLimitTier = 'STRICT' | 'STANDARD' | 'TURBO';

const TIER_CONFIGS: Record<RateLimitTier, { maxRequests: number; windowMs: number }> = {
  STRICT: { maxRequests: 5, windowMs: 60 * 1000 },      // 5 requests / min (Login, Passwords, WhatsApp broadcast)
  STANDARD: { maxRequests: 60, windowMs: 60 * 1000 },   // 60 requests / min (General APIs)
  TURBO: { maxRequests: 300, windowMs: 60 * 1000 },     // 300 requests / min (Continuous barcode/QR scans)
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

export function checkRateLimit(ip: string, actionKey: string, tier: RateLimitTier = 'STANDARD'): RateLimitResult {
  const config = TIER_CONFIGS[tier];
  const now = Date.now();
  const key = `${tier}:${actionKey}:${ip}`;

  const currentRecord = ratesStore.get(key);

  if (!currentRecord || now > currentRecord.resetTime) {
    const resetTime = now + config.windowMs;
    ratesStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  if (currentRecord.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetSeconds: Math.ceil((currentRecord.resetTime - now) / 1000),
    };
  }

  currentRecord.count += 1;
  return {
    success: true,
    remaining: config.maxRequests - currentRecord.count,
    resetSeconds: Math.ceil((currentRecord.resetTime - now) / 1000),
  };
}

// In-memory Sliding Window Rate Limiter for Authentication & Sensitive Endpoints

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Evaluates rate limit for a key (e.g. IP + endpoint).
 * Returns { allowed: boolean, remaining: number, resetTimeMs: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests = 10,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetTimeMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Filter timestamps within current window
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0];
    const resetTimeMs = oldest + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      resetTimeMs: Math.max(resetTimeMs, 0),
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: maxRequests - validTimestamps.length,
    resetTimeMs: windowMs,
  };
}

/**
 * Resets rate limit for a key (e.g., after successful authenticated login).
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

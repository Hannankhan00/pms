export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in seconds
}

interface RequestRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RequestRecord>();

// Predefined strict limits per critical route
export const ROUTE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/internal/provision-tenant": { maxRequests: 10, windowSeconds: 60 },
  "/api/auth/sso/callback": { maxRequests: 30, windowSeconds: 60 },
  "/api/pos/checkout": { maxRequests: 60, windowSeconds: 60 },
  "/api/pos": { maxRequests: 60, windowSeconds: 60 },
  default: { maxRequests: 120, windowSeconds: 60 },
};

/**
 * High-performance sliding-window in-memory rate limiter with periodic cleanup.
 */
export function checkRateLimit(
  identifier: string,
  pathname: string,
  customConfig?: RateLimitConfig
): RateLimitResult {
  const config =
    customConfig ||
    ROUTE_RATE_LIMITS[pathname] ||
    Object.entries(ROUTE_RATE_LIMITS).find(([route]) => pathname.startsWith(route))?.[1] ||
    ROUTE_RATE_LIMITS.default;

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `${pathname}:${identifier}`;

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Filter out timestamps outside the active sliding window
  const windowStart = now - windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  const resetTime = Math.ceil((now + windowMs) / 1000);

  if (record.timestamps.length >= config.maxRequests) {
    const oldest = record.timestamps[0];
    const earliestReset = Math.ceil((oldest + windowMs) / 1000);

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: earliestReset,
    };
  }

  // Record this request
  record.timestamps.push(now);

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - record.timestamps.length),
    resetTime,
  };
}

/**
 * Clears old expired keys to prevent memory leaks in long-running processes.
 */
export function cleanupExpiredRateLimits() {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 300000);
    if (record.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Resets memory store (primarily for unit tests).
 */
export function resetRateLimits() {
  memoryStore.clear();
}

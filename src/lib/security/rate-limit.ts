/**
 * In-memory sliding-window rate limiter. Suitable for a single-instance
 * deployment or as a first-line defense in front of a shared limiter.
 *
 * For multi-instance deployments (Vercel serverless, multi-region) this
 * module MUST be fronted by Upstash Ratelimit, Redis INCR, or Vercel's
 * edge rate-limit primitive — in-memory state is per-process and will
 * not share counters across warm functions. See Phase 14 runbook.
 */

interface Window {
  readonly limit: number;
  readonly intervalMs: number;
  readonly hits: number[];
}

const buckets = new Map<string, Window>();

export interface RateLimitConfig {
  /** Max requests permitted within `intervalMs`. */
  limit: number;
  /** Sliding window size in ms. */
  intervalMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Consume one token from the bucket for `key`. Returns allowed=false if the
 * caller has exceeded `limit` within the sliding window.
 *
 * Time source is injectable for deterministic tests (pass `now`).
 */
export function consume(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now(),
): RateLimitResult {
  const { limit, intervalMs } = config;
  const cutoff = now - intervalMs;

  let bucket = buckets.get(key);
  if (!bucket || bucket.limit !== limit || bucket.intervalMs !== intervalMs) {
    bucket = { limit, intervalMs, hits: [] };
    buckets.set(key, bucket);
  }

  // Drop expired entries from the front (hits is time-ordered).
  while (bucket.hits.length > 0 && (bucket.hits[0] ?? 0) <= cutoff) {
    bucket.hits.shift();
  }

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + intervalMs - now),
    };
  }

  bucket.hits.push(now);
  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    retryAfterMs: 0,
  };
}

/** Reset all buckets. Test-only. */
export function resetAllBuckets(): void {
  buckets.clear();
}

/**
 * Derives a stable key for an incoming request. Prefers the first value in
 * X-Forwarded-For (trusted at the Vercel edge), then X-Real-IP, then falls
 * back to a shared bucket. The fallback is deliberately lossy so a misconfig
 * degrades to "everyone shares one bucket" rather than "no limit".
 */
export function clientKey(request: Request, scope: string): string {
  const xff = request.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anon";
  return `${scope}:${ip}`;
}

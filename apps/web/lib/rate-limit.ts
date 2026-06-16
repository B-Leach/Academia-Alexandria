import crypto from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// ---------------------------------------------------------------------------
// Sliding Window Rate Limiter (In-Memory)
// ---------------------------------------------------------------------------

interface WindowEntry {
  prev: number;
  curr: number;
  prevStart: number;
  currStart: number;
}

class SlidingWindowRateLimiter {
  private windows = new Map<string, WindowEntry>();
  readonly windowMs: number;
  readonly max: number;

  constructor(windowMs: number, max: number) {
    this.windowMs = windowMs;
    this.max = max;

    if (typeof setInterval !== "undefined") {
      const timer = setInterval(() => this.cleanup(), this.windowMs * 2);
      timer.unref?.();
    }
  }

  check(key: string): boolean {
    const now = Date.now();
    const windowStart = now - (now % this.windowMs);
    const entry = this.windows.get(key);

    if (!entry || windowStart > entry.currStart + this.windowMs) {
      this.windows.set(key, {
        prev: 0,
        curr: 1,
        prevStart: windowStart - this.windowMs,
        currStart: windowStart,
      });
      return true;
    }

    if (windowStart > entry.currStart) {
      entry.prev = entry.curr;
      entry.curr = 0;
      entry.prevStart = entry.currStart;
      entry.currStart = windowStart;
    }

    const elapsed = now - entry.currStart;
    const weight = Math.max(0, 1 - elapsed / this.windowMs);
    const estimate = entry.prev * weight + entry.curr;

    if (estimate >= this.max) {
      return false;
    }

    entry.curr++;
    return true;
  }

  retryAfterSeconds(): number {
    const now = Date.now();
    const windowStart = now - (now % this.windowMs);
    const remaining = this.windowMs - (now - windowStart);
    return Math.ceil(remaining / 1000);
  }

  private cleanup() {
    const cutoff = Date.now() - this.windowMs * 2;
    for (const [key, entry] of this.windows) {
      if (entry.currStart < cutoff) {
        this.windows.delete(key);
      }
    }
  }

  reset() {
    this.windows.clear();
  }
}

// ---------------------------------------------------------------------------
// Redis Sliding Window (sorted set approach)
// ---------------------------------------------------------------------------

async function checkRedis(
  redisKey: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  if (!redis) return true;

  const now = Date.now();
  const windowStart = now - windowMs;
  const member = `${now}:${crypto.randomUUID().slice(0, 8)}`;

  const results = await redis
    .multi()
    .zremrangebyscore(redisKey, 0, windowStart)
    .zadd(redisKey, now, member)
    .zcard(redisKey)
    .pexpire(redisKey, windowMs * 2)
    .exec();

  if (!results) return true;

  const count = results[2]?.[1] as number;
  if (count > max) {
    // Remove the entry we just added since the request is denied
    await redis.zrem(redisKey, member);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Pre-configured limiter instances
// ---------------------------------------------------------------------------

const limiters = {
  auth: new SlidingWindowRateLimiter(15 * 60 * 1000, 5), // 5 per 15 min
  write: new SlidingWindowRateLimiter(15 * 60 * 1000, 20), // 20 per 15 min
  upload: new SlidingWindowRateLimiter(60 * 60 * 1000, 10), // 10 per hour
  read: new SlidingWindowRateLimiter(60 * 1000, 60), // 60 per minute
  stripe: new SlidingWindowRateLimiter(15 * 60 * 1000, 10), // 10 per 15 min
  admin: new SlidingWindowRateLimiter(15 * 60 * 1000, 30), // 30 per 15 min
} as const;

type LimiterName = keyof typeof limiters;

const RATE_LIMIT_ERROR = "Too many requests. Please try again later.";

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

function getIpFromHeaders(headerMap: Headers | Map<string, string>): string {
  const forwarded = headerMap.get("x-forwarded-for");
  if (forwarded) {
    // Use rightmost IP — added by the trusted reverse proxy, not spoofable by client
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[ips.length - 1];
  }

  return headerMap.get("x-real-ip") || "unknown";
}

// ---------------------------------------------------------------------------
// Core check (Redis or in-memory)
// ---------------------------------------------------------------------------

async function checkLimit(
  name: LimiterName,
  key: string,
): Promise<boolean> {
  const limiter = limiters[name];
  const fullKey = `${name}:${key}`;

  if (redis) {
    return checkRedis(`rl:${fullKey}`, limiter.windowMs, limiter.max);
  }

  return limiter.check(fullKey);
}

// ---------------------------------------------------------------------------
// Helpers for server actions
// ---------------------------------------------------------------------------

export async function rateLimitByIp(
  name: LimiterName,
): Promise<{ error: string } | null> {
  let headerMap: Awaited<ReturnType<typeof headers>>;
  try {
    headerMap = await headers();
  } catch {
    return null;
  }
  const ip = getIpFromHeaders(headerMap);

  if (!(await checkLimit(name, ip))) {
    return { error: RATE_LIMIT_ERROR };
  }
  return null;
}

export async function rateLimitByUser(
  name: LimiterName,
  userId: string,
): Promise<{ error: string } | null> {
  if (!(await checkLimit(name, userId))) {
    return { error: RATE_LIMIT_ERROR };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helper for API routes
// ---------------------------------------------------------------------------

export async function checkApiRateLimit(
  name: LimiterName,
  key: string,
): Promise<NextResponse | null> {
  const limiter = limiters[name];

  if (!(await checkLimit(name, key))) {
    const retryAfter = limiter.retryAfterSeconds();
    return NextResponse.json(
      { error: RATE_LIMIT_ERROR },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tier-aware API rate limiting
// ---------------------------------------------------------------------------

const API_TIER_LIMITS: Record<string, number> = {
  FREE: 60,
  BASIC: 300,
  PREMIUM: 1000,
};

export async function checkApiRateLimitByTier(
  key: string,
  tier: string,
): Promise<NextResponse | null> {
  const max = API_TIER_LIMITS[tier] ?? API_TIER_LIMITS.FREE;
  const windowMs = 60 * 1000; // 1 minute
  const fullKey = `api-tier:${key}`;

  if (redis) {
    const allowed = await checkRedis(`rl:${fullKey}`, windowMs, max);
    if (!allowed) {
      return NextResponse.json(
        { error: RATE_LIMIT_ERROR },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    return null;
  }

  // Fallback: use the standard read limiter for in-memory
  return checkApiRateLimit("read", key);
}

// ---------------------------------------------------------------------------
// Helpers for API routes — IP extraction from request
// ---------------------------------------------------------------------------

export function getIpFromRequest(request: { headers: Headers }): string {
  return getIpFromHeaders(request.headers);
}

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

export function resetAllLimiters() {
  for (const limiter of Object.values(limiters)) {
    limiter.reset();
  }
}

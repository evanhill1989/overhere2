// src/lib/security/rateLimit.ts (Enhanced version)
import { NextRequest, NextResponse } from "next/server";

// type RateLimitStore = Map<string, { count: number; resetTime: number }>;
type RateLimitConfig = {
  limit: number;
  windowMs: number;
  identifier?: string;
};

// Separate stores for different action types
const stores = {
  default: new Map<string, { count: number; resetTime: number }>(),
  checkin: new Map<string, { count: number; resetTime: number }>(),
  messaging: new Map<string, { count: number; resetTime: number }>(),
  search: new Map<string, { count: number; resetTime: number }>(),
} as const;

type StoreType = keyof typeof stores;

export function rateLimit(
  identifier: string,
  config: RateLimitConfig & { storeType?: StoreType } = {
    limit: 10,
    windowMs: 60000,
  },
): { success: boolean; remaining: number; resetTime: number } {
  const { limit, windowMs, storeType = "default" } = config;
  const store = stores[storeType];
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    store.set(identifier, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return {
    success: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  };
}

export function getRateLimitHeaders(
  identifier: string,
  limit: number = 10,
  storeType: StoreType = "default",
): Record<string, string> {
  const record = stores[storeType].get(identifier);

  if (!record) {
    return {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(limit),
    };
  }

  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, limit - record.count)),
    "X-RateLimit-Reset": String(record.resetTime),
  };
}

export function handleRateLimit(
  request: NextRequest,
  config: RateLimitConfig & { storeType?: StoreType } = {
    limit: 10,
    windowMs: 60000,
  },
): NextResponse | null {
  const ip = getClientIP(request);
  const { success, resetTime } = rateLimit(ip, config);

  if (!success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          ...getRateLimitHeaders(ip, config.limit, config.storeType),
          "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)),
        },
      },
    );
  }

  return null;
}

export function getClientIP(request: NextRequest): string {
  // Try multiple headers to get the real client IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip"); // Cloudflare

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwardedFor.split(",")[0].trim();
  }

  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;

  // Fallback to a default identifier
  return "unknown";
}

// Clean up expired entries periodically (run this in a background job)
export function cleanupExpiredEntries() {
  const now = Date.now();

  Object.values(stores).forEach((store) => {
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  });
}

// Auto-cleanup every 10 minutes
if (typeof window === "undefined") {
  setInterval(cleanupExpiredEntries, 10 * 60 * 1000);
}

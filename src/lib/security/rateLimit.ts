// src/lib/security/rateLimit.ts
import { NextRequest, NextResponse } from "next/server";

type RateLimitStore = Map<string, { count: number; resetTime: number }>;

const store: RateLimitStore = new Map();

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000,
): boolean {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    store.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export function getRateLimitHeaders(
  identifier: string,
  limit: number = 10,
): Record<string, string> {
  const record = store.get(identifier);

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
  limit: number = 10,
  windowMs: number = 60000,
): NextResponse | null {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(ip, limit, windowMs)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: getRateLimitHeaders(ip, limit),
      },
    );
  }

  return null;
}

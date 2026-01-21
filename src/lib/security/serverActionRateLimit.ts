// src/lib/security/serverActionRateLimit.ts
import { headers } from "next/headers";
import { rateLimit } from "./rateLimit";

type ServerActionRateLimitConfig = {
  limit: number;
  windowMs: number;
  storeType?: "checkin" | "messaging" | "search" | "default";
  errorMessage?: string;
};

export async function checkServerActionRateLimit(
  config: ServerActionRateLimitConfig,
): Promise<{ success: boolean; error?: string; remaining?: number }> {
  try {
    const headersList = await headers();

    // Get client IP from headers
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIP = headersList.get("x-real-ip");
    const cfConnectingIP = headersList.get("cf-connecting-ip");

    const clientIP =
      forwardedFor?.split(",")[0].trim() ||
      realIP ||
      cfConnectingIP ||
      "unknown";

    const result = rateLimit(clientIP, {
      limit: config.limit,
      windowMs: config.windowMs,
      storeType: config.storeType || "default",
    });

    if (!result.success) {
      const waitTime = Math.ceil((result.resetTime - Date.now()) / 1000);
      return {
        success: false,
        error:
          config.errorMessage ||
          `Too many requests. Please try again in ${waitTime} seconds.`,
        remaining: result.remaining,
      };
    }

    return { success: true, remaining: result.remaining };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // On error, allow the request (fail open)
    return { success: true };
  }
}

// Specific rate limit configs for different actions
export const RATE_LIMIT_CONFIGS = {
  checkin: {
    limit: 100, // 3 check-ins per hour test number
    windowMs: 60 * 60 * 1000, // 1 hour
    storeType: "checkin" as const,
    errorMessage:
      "You can only check in 3 times per hour. Please try again later.",
  },
  messageRequest: {
    limit: 100, // 10 message requests per 5 minutes
    windowMs: 5 * 60 * 1000, // 5 minutes
    storeType: "messaging" as const,
    errorMessage:
      "Too many message requests. Please wait before sending another request.",
  },
  sendMessage: {
    limit: 600, // 60 messages per 10 minutes (1 per 10 seconds average)
    windowMs: 10 * 60 * 1000, // 10 minutes
    storeType: "messaging" as const,
    errorMessage: "Slow down! You're sending messages too quickly.",
  },
  searchPlaces: {
    limit: 300, // 30 searches per 5 minutes
    windowMs: 5 * 60 * 1000, // 5 minutes
    storeType: "search" as const,
    errorMessage: "Too many searches. Please wait before searching again.",
  },
  respondToRequest: {
    limit: 200, // 20 responses per 5 minutes
    windowMs: 5 * 60 * 1000, // 5 minutes
    storeType: "messaging" as const,
    errorMessage: "Too many request responses. Please slow down.",
  },
  // Claim verification rate limits
  CLAIM_START: {
    maxRequests: 2, // Max 2 claim starts per user per day
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "claim:start",
  },

  CLAIM_SUBMIT_BUSINESS_INFO: {
    maxRequests: 5, // Allow some retries for form errors
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "claim:business_info",
  },

  CLAIM_SEND_VERIFICATION_CODE: {
    maxRequests: 3, // Max 3 code sends per claim
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "claim:send_code",
  },

  CLAIM_VERIFY_CODE: {
    maxRequests: 3, // Max 3 verification attempts
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: "claim:verify_code",
  },

  CLAIM_RESEND_CODE: {
    maxRequests: 2, // Max 2 resends
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "claim:resend_code",
  },

  // Per-IP rate limits (stricter)
  CLAIM_START_IP: {
    maxRequests: 5, // Max 5 claim starts from same IP per day
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "claim:start:ip",
  },

  CLAIM_START_IP_WEEKLY: {
    maxRequests: 10, // Max 10 claims per IP per week
    windowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    keyPrefix: "claim:start:ip:weekly",
  },

  // Per-phone rate limits
  CLAIM_PHONE_VERIFICATION: {
    maxRequests: 5, // Max 5 verification attempts per phone per day
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "claim:phone:verify",
  },

  // Per-place rate limits
  CLAIM_PER_PLACE_DAILY: {
    maxRequests: 10, // Max 10 claims for same place per day
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: "claim:place:daily",
  },
} as const;

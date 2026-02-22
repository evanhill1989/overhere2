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
    limit: 2,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    storeType: "default" as const,
    errorMessage: "You can only start 2 claim requests per day.",
  },

  CLAIM_SUBMIT_BUSINESS_INFO: {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    storeType: "default" as const,
  },

  CLAIM_SEND_VERIFICATION_CODE: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    storeType: "default" as const,
  },

  CLAIM_VERIFY_CODE: {
    limit: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
    storeType: "default" as const,
  },

  CLAIM_RESEND_CODE: {
    limit: 2,
    windowMs: 60 * 60 * 1000, // 1 hour
    storeType: "default" as const,
  },

  CLAIM_START_IP: {
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    storeType: "default" as const,
  },

  CLAIM_START_IP_WEEKLY: {
    limit: 10,
    windowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    storeType: "default" as const,
  },

  CLAIM_PHONE_VERIFICATION: {
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    storeType: "default" as const,
  },

  CLAIM_PER_PLACE_DAILY: {
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    storeType: "default" as const,
  },
} as const;

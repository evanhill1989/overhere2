"use server";

import { db } from "@/lib/db";
import { claimRateLimitTable, placeClaimsTable } from "@/lib/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import type { UserId, PlaceId } from "@/lib/types/database";

// ============================================
// CONSTANTS
// ============================================

export const CLAIM_LIMITS = {
  // Per-user limits
  MAX_ACTIVE_CLAIMS: 1,
  MAX_LIFETIME_CLAIMS: 10,
  MAX_REJECTED_CLAIMS: 3,
  REJECTION_COOLDOWN_DAYS: 60,

  // Per-IP limits
  MAX_CLAIMS_PER_IP_PER_DAY: 2,
  MAX_CLAIMS_PER_IP_PER_WEEK: 5,

  // Per-place limits
  MAX_CLAIMS_PER_PLACE_PER_DAY: 10,

  // Per-phone limits
  REQUIRE_UNIQUE_PHONE_PER_PLACE: true,

  // Account requirements
  MIN_ACCOUNT_AGE_DAYS: 7,
  MIN_CHECKINS_BEFORE_CLAIM: 1,

  // Verification code limits
  CODE_LENGTH: 6,
  CODE_EXPIRY_MINUTES: 10,
  MAX_VERIFICATION_ATTEMPTS: 3,
  MAX_CODE_RESENDS: 2,
  RESEND_COOLDOWN_SECONDS: 60,
} as const;

// ============================================
// ELIGIBILITY CHECKS
// ============================================

export type ClaimEligibilityResult = {
  eligible: boolean;
  reason?: string;
  details?: Record<string, unknown>;
};

/**
 * Check if user is eligible to start a new claim
 */
export async function checkUserClaimEligibility(
  userId: UserId,
): Promise<ClaimEligibilityResult> {
  // Check active claims
  const activeClaims = await db
    .select()
    .from(placeClaimsTable)
    .where(
      and(
        eq(placeClaimsTable.userId, userId),
        eq(placeClaimsTable.status, "pending"),
      ),
    );

  if (activeClaims.length >= CLAIM_LIMITS.MAX_ACTIVE_CLAIMS) {
    return {
      eligible: false,
      reason:
        "You already have a pending claim. Please wait for it to be reviewed.",
      details: { activeClaimCount: activeClaims.length },
    };
  }

  // Check lifetime claims
  const allClaims = await db
    .select()
    .from(placeClaimsTable)
    .where(eq(placeClaimsTable.userId, userId));

  if (allClaims.length >= CLAIM_LIMITS.MAX_LIFETIME_CLAIMS) {
    return {
      eligible: false,
      reason: "You have reached the maximum number of lifetime claims.",
      details: { lifetimeClaimCount: allClaims.length },
    };
  }

  // Check rejected claims and cooldown
  const rejectedClaims = allClaims.filter((c) => c.status === "rejected");

  if (rejectedClaims.length >= CLAIM_LIMITS.MAX_REJECTED_CLAIMS) {
    const mostRecentRejection = rejectedClaims.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )[0];

    const daysSinceRejection =
      (Date.now() - new Date(mostRecentRejection.submittedAt).getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysSinceRejection < CLAIM_LIMITS.REJECTION_COOLDOWN_DAYS) {
      return {
        eligible: false,
        reason: `You have too many rejected claims. Please wait ${Math.ceil(
          CLAIM_LIMITS.REJECTION_COOLDOWN_DAYS - daysSinceRejection,
        )} more days before trying again.`,
        details: {
          rejectedClaimCount: rejectedClaims.length,
          daysRemaining: Math.ceil(
            CLAIM_LIMITS.REJECTION_COOLDOWN_DAYS - daysSinceRejection,
          ),
        },
      };
    }
  }

  return { eligible: true };
}

/**
 * Check IP-based rate limits for claim creation
 */
export async function checkIpClaimLimit(
  ipAddress: string,
): Promise<ClaimEligibilityResult> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Check daily limit
  const dailyCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(claimRateLimitTable)
    .where(
      and(
        eq(claimRateLimitTable.ipAddress, ipAddress),
        gte(claimRateLimitTable.lastClaimAt, oneDayAgo),
      ),
    );

  const dailyClaimCount = Number(dailyCount[0]?.count ?? 0);

  if (dailyClaimCount >= CLAIM_LIMITS.MAX_CLAIMS_PER_IP_PER_DAY) {
    return {
      eligible: false,
      reason:
        "Too many claim attempts from your network. Please try again tomorrow.",
      details: { dailyClaimCount },
    };
  }

  // Check weekly limit
  const weeklyCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(claimRateLimitTable)
    .where(
      and(
        eq(claimRateLimitTable.ipAddress, ipAddress),
        gte(claimRateLimitTable.lastClaimAt, oneWeekAgo),
      ),
    );

  const weeklyClaimCount = Number(weeklyCount[0]?.count ?? 0);

  if (weeklyClaimCount >= CLAIM_LIMITS.MAX_CLAIMS_PER_IP_PER_WEEK) {
    return {
      eligible: false,
      reason:
        "Too many claim attempts from your network. Please try again next week.",
      details: { weeklyClaimCount },
    };
  }

  return { eligible: true };
}

/**
 * Check per-place rate limits
 */
export async function checkPlaceClaimLimit(
  placeId: PlaceId,
): Promise<ClaimEligibilityResult> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentClaims = await db
    .select({ count: sql<number>`count(*)` })
    .from(placeClaimsTable)
    .where(
      and(
        eq(placeClaimsTable.placeId, placeId),
        gte(placeClaimsTable.submittedAt, oneDayAgo),
      ),
    );

  const claimCount = Number(recentClaims[0]?.count ?? 0);

  if (claimCount >= CLAIM_LIMITS.MAX_CLAIMS_PER_PLACE_PER_DAY) {
    return {
      eligible: false,
      reason:
        "This location has received too many claim requests today. Please try again tomorrow.",
      details: { claimCount },
    };
  }

  return { eligible: true };
}

/**
 * Check if phone number is already used for this place
 */
export async function checkPhoneUniqueness(
  placeId: PlaceId,
  phoneNumber: string,
): Promise<ClaimEligibilityResult> {
  if (!CLAIM_LIMITS.REQUIRE_UNIQUE_PHONE_PER_PLACE) {
    return { eligible: true };
  }

  const existingClaim = await db
    .select()
    .from(placeClaimsTable)
    .where(
      and(
        eq(placeClaimsTable.placeId, placeId),
        eq(placeClaimsTable.phoneNumber, phoneNumber),
        sql`${placeClaimsTable.status} IN ('pending', 'verified')`,
      ),
    );

  if (existingClaim.length > 0) {
    return {
      eligible: false,
      reason:
        "This phone number is already associated with a claim for this location.",
    };
  }

  return { eligible: true };
}

/**
 * Check if place already has a verified owner
 */
export async function checkExistingOwnership(
  placeId: PlaceId,
): Promise<ClaimEligibilityResult> {
  const existingClaim = await db
    .select()
    .from(placeClaimsTable)
    .where(
      and(
        eq(placeClaimsTable.placeId, placeId),
        eq(placeClaimsTable.status, "verified"),
      ),
    );

  if (existingClaim.length > 0) {
    return {
      eligible: false,
      reason:
        "This location already has a verified owner. Contact support if you believe this is an error.",
      details: { hasVerifiedOwner: true },
    };
  }

  return { eligible: true };
}

/**
 * Record IP claim attempt for rate limiting
 */
export async function recordIpClaimAttempt(ipAddress: string): Promise<void> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Clean up old entries first
  await db
    .delete(claimRateLimitTable)
    .where(
      and(
        eq(claimRateLimitTable.ipAddress, ipAddress),
        sql`${claimRateLimitTable.windowStart} < ${oneDayAgo}`,
      ),
    );

  // Insert new entry
  await db.insert(claimRateLimitTable).values({
    ipAddress,
    claimCount: 1,
    windowStart: now,
    lastClaimAt: now,
  });
}

/**
 * Comprehensive eligibility check before starting claim
 */
export async function checkClaimEligibility(
  userId: UserId,
  placeId: PlaceId,
  ipAddress: string,
): Promise<ClaimEligibilityResult> {
  // Check user eligibility
  const userCheck = await checkUserClaimEligibility(userId);
  if (!userCheck.eligible) return userCheck;

  // Check IP rate limits
  const ipCheck = await checkIpClaimLimit(ipAddress);
  if (!ipCheck.eligible) return ipCheck;

  // Check place rate limits
  const placeCheck = await checkPlaceClaimLimit(placeId);
  if (!placeCheck.eligible) return placeCheck;

  // Check existing ownership
  const ownershipCheck = await checkExistingOwnership(placeId);
  if (!ownershipCheck.eligible) return ownershipCheck;

  return { eligible: true };
}

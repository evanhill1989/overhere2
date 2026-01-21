"use server";

import { db } from "@/lib/db";
import {
  placeClaimsTable,
  checkinsTable,
  usersTable,
  verifiedOwnersTable,
} from "@/lib/schema";
import { eq, and, sql, gte, count } from "drizzle-orm";
import type { UserId, PlaceId, CheckinId } from "@/lib/types/database";

// ============================================
// FRAUD DETECTION CONFIGURATION
// ============================================

export const FRAUD_THRESHOLDS = {
  // Score ranges (0-100)
  LOW_RISK: 25, // 0-25: Auto-approve eligible
  MEDIUM_RISK: 50, // 26-50: Standard review
  HIGH_RISK: 75, // 51-75: Enhanced review
  CRITICAL_RISK: 100, // 76-100: Reject or intensive review

  // Individual signal scores
  SCORE_NEW_ACCOUNT: 15, // Account < 30 days
  SCORE_VERY_NEW_ACCOUNT: 25, // Account < 7 days
  SCORE_NO_CHECKIN_HISTORY: 20, // 0 previous check-ins
  SCORE_SINGLE_CHECKIN: 10, // Only 1 check-in ever
  SCORE_DUPLICATE_PHONE: 30, // Phone used in another claim
  SCORE_EMAIL_DOMAIN_MISMATCH: 15, // Email doesn't match business
  SCORE_MULTIPLE_IP_CLAIMS: 25, // Multiple claims from same IP
  SCORE_PREVIOUS_REJECTION: 20, // User has rejected claims
  SCORE_MULTIPLE_REJECTIONS: 40, // User has 2+ rejections
  SCORE_PLACE_HAS_OWNER: 50, // Place already claimed
  SCORE_SUSPICIOUS_TIMING: 10, // Claim outside business hours
  SCORE_NO_RECENT_CHECKIN: 15, // No check-in in last 24h
  SCORE_CHECKIN_TOO_OLD: 25, // Check-in > 7 days ago
  SCORE_RAPID_SUBMISSION: 15, // Claim submitted too quickly
} as const;

// ============================================
// FRAUD SIGNAL DETECTION
// ============================================

export type FraudSignal = {
  type: string;
  score: number;
  description: string;
  metadata?: Record<string, unknown>;
};

export type FraudAnalysisResult = {
  fraudScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: FraudSignal[];
  recommendation:
    | "auto_approve"
    | "standard_review"
    | "enhanced_review"
    | "reject";
  requiresManualReview: boolean;
};

/**
 * Calculate fraud score for a claim
 */
export async function calculateFraudScore(params: {
  userId: UserId;
  placeId: PlaceId;
  checkinId?: CheckinId | null;
  phoneNumber?: string | null;
  businessEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  userCreatedAt: Date;
}): Promise<FraudAnalysisResult> {
  const signals: FraudSignal[] = [];
  let totalScore = 0;

  // ============================================
  // SIGNAL 1: Account Age
  // ============================================
  const accountAgeInDays =
    (Date.now() - params.userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (accountAgeInDays < 7) {
    const signal: FraudSignal = {
      type: "very_new_account",
      score: FRAUD_THRESHOLDS.SCORE_VERY_NEW_ACCOUNT,
      description: `Account created ${Math.floor(accountAgeInDays)} days ago (< 7 days)`,
      metadata: { accountAgeInDays: Math.floor(accountAgeInDays) },
    };
    signals.push(signal);
    totalScore += signal.score;
  } else if (accountAgeInDays < 30) {
    const signal: FraudSignal = {
      type: "new_account",
      score: FRAUD_THRESHOLDS.SCORE_NEW_ACCOUNT,
      description: `Account created ${Math.floor(accountAgeInDays)} days ago (< 30 days)`,
      metadata: { accountAgeInDays: Math.floor(accountAgeInDays) },
    };
    signals.push(signal);
    totalScore += signal.score;
  }

  // ============================================
  // SIGNAL 2: Check-in History
  // ============================================
  const userCheckins = await db
    .select({ count: count() })
    .from(checkinsTable)
    .where(eq(checkinsTable.userId, params.userId));

  const checkinCount = userCheckins[0]?.count ?? 0;

  if (checkinCount === 0) {
    const signal: FraudSignal = {
      type: "no_checkin_history",
      score: FRAUD_THRESHOLDS.SCORE_NO_CHECKIN_HISTORY,
      description: "User has never checked in before (0 check-ins)",
      metadata: { checkinCount: 0 },
    };
    signals.push(signal);
    totalScore += signal.score;
  } else if (checkinCount === 1) {
    const signal: FraudSignal = {
      type: "single_checkin",
      score: FRAUD_THRESHOLDS.SCORE_SINGLE_CHECKIN,
      description: "User has only 1 check-in (created just to claim)",
      metadata: { checkinCount: 1 },
    };
    signals.push(signal);
    totalScore += signal.score;
  }

  // ============================================
  // SIGNAL 3: Recent Check-in Validation
  // ============================================
  if (params.checkinId) {
    const checkin = await db
      .select()
      .from(checkinsTable)
      .where(eq(checkinsTable.id, params.checkinId))
      .limit(1);

    if (checkin.length > 0) {
      const checkinAge =
        (Date.now() - new Date(checkin[0].createdAt).getTime()) /
        (1000 * 60 * 60);

      if (checkinAge > 168) {
        // > 7 days
        const signal: FraudSignal = {
          type: "checkin_too_old",
          score: FRAUD_THRESHOLDS.SCORE_CHECKIN_TOO_OLD,
          description: `Check-in is ${Math.floor(checkinAge / 24)} days old (> 7 days)`,
          metadata: { checkinAgeInHours: Math.floor(checkinAge) },
        };
        signals.push(signal);
        totalScore += signal.score;
      } else if (checkinAge > 24) {
        // > 24 hours
        const signal: FraudSignal = {
          type: "no_recent_checkin",
          score: FRAUD_THRESHOLDS.SCORE_NO_RECENT_CHECKIN,
          description: `Check-in is ${Math.floor(checkinAge)} hours old (> 24 hours)`,
          metadata: { checkinAgeInHours: Math.floor(checkinAge) },
        };
        signals.push(signal);
        totalScore += signal.score;
      }

      // Check if check-in is at the claimed place
      if (checkin[0].placeId !== params.placeId) {
        const signal: FraudSignal = {
          type: "checkin_place_mismatch",
          score: 50, // Very suspicious
          description:
            "Check-in is at a different location than the claimed place",
          metadata: {
            checkinPlaceId: checkin[0].placeId,
            claimPlaceId: params.placeId,
          },
        };
        signals.push(signal);
        totalScore += signal.score;
      }
    }
  } else {
    const signal: FraudSignal = {
      type: "no_checkin_provided",
      score: FRAUD_THRESHOLDS.SCORE_NO_RECENT_CHECKIN,
      description: "No recent check-in linked to this claim",
    };
    signals.push(signal);
    totalScore += signal.score;
  }

  // ============================================
  // SIGNAL 4: Phone Number Reuse
  // ============================================
  if (params.phoneNumber) {
    const duplicatePhoneClaims = await db
      .select({ count: count() })
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.phoneNumber, params.phoneNumber),
          sql`${placeClaimsTable.userId} != ${params.userId}`,
        ),
      );

    const duplicateCount = duplicatePhoneClaims[0]?.count ?? 0;

    if (duplicateCount > 0) {
      const signal: FraudSignal = {
        type: "duplicate_phone",
        score: FRAUD_THRESHOLDS.SCORE_DUPLICATE_PHONE,
        description: `Phone number used in ${duplicateCount} other claim(s)`,
        metadata: { duplicatePhoneCount: duplicateCount },
      };
      signals.push(signal);
      totalScore += signal.score;
    }
  }

  // ============================================
  // SIGNAL 5: Email Domain Validation
  // ============================================
  if (params.businessEmail) {
    const emailDomain = params.businessEmail.split("@")[1]?.toLowerCase();
    const commonDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "aol.com",
      "icloud.com",
      "protonmail.com",
    ];

    if (emailDomain && commonDomains.includes(emailDomain)) {
      const signal: FraudSignal = {
        type: "email_domain_mismatch",
        score: FRAUD_THRESHOLDS.SCORE_EMAIL_DOMAIN_MISMATCH,
        description: `Using personal email domain (${emailDomain}) instead of business domain`,
        metadata: { emailDomain },
      };
      signals.push(signal);
      totalScore += signal.score;
    }
  }

  // ============================================
  // SIGNAL 6: IP Address Pattern
  // ============================================
  if (params.ipAddress) {
    const ipClaims = await db
      .select({ count: count() })
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.ipAddress, params.ipAddress),
          sql`${placeClaimsTable.userId} != ${params.userId}`,
        ),
      );

    const ipClaimCount = ipClaims[0]?.count ?? 0;

    if (ipClaimCount >= 3) {
      const signal: FraudSignal = {
        type: "multiple_ip_claims",
        score: FRAUD_THRESHOLDS.SCORE_MULTIPLE_IP_CLAIMS,
        description: `${ipClaimCount} claims from this IP by different users`,
        metadata: { ipClaimCount },
      };
      signals.push(signal);
      totalScore += signal.score;
    }
  }

  // ============================================
  // SIGNAL 7: Previous Claim History
  // ============================================
  const userClaims = await db
    .select()
    .from(placeClaimsTable)
    .where(eq(placeClaimsTable.userId, params.userId));

  const rejectedClaims = userClaims.filter((c) => c.status === "rejected");

  if (rejectedClaims.length >= 2) {
    const signal: FraudSignal = {
      type: "multiple_rejections",
      score: FRAUD_THRESHOLDS.SCORE_MULTIPLE_REJECTIONS,
      description: `User has ${rejectedClaims.length} rejected claims`,
      metadata: { rejectedClaimCount: rejectedClaims.length },
    };
    signals.push(signal);
    totalScore += signal.score;
  } else if (rejectedClaims.length === 1) {
    const signal: FraudSignal = {
      type: "previous_rejection",
      score: FRAUD_THRESHOLDS.SCORE_PREVIOUS_REJECTION,
      description: "User has 1 previously rejected claim",
      metadata: { rejectedClaimCount: 1 },
    };
    signals.push(signal);
    totalScore += signal.score;
  }

  // ============================================
  // SIGNAL 8: Existing Ownership
  // ============================================
  const existingOwner = await db
    .select({ count: count() })
    .from(verifiedOwnersTable)
    .where(eq(verifiedOwnersTable.placeId, params.placeId));

  const hasExistingOwner = (existingOwner[0]?.count ?? 0) > 0;

  if (hasExistingOwner) {
    const signal: FraudSignal = {
      type: "place_has_owner",
      score: FRAUD_THRESHOLDS.SCORE_PLACE_HAS_OWNER,
      description: "This place already has a verified owner",
      metadata: { hasExistingOwner: true },
    };
    signals.push(signal);
    totalScore += signal.score;
  }

  // ============================================
  // SIGNAL 9: Suspicious Timing
  // ============================================
  const currentHour = new Date().getHours();
  // Flag claims submitted between 2 AM - 6 AM (suspicious for most businesses)
  if (currentHour >= 2 && currentHour < 6) {
    const signal: FraudSignal = {
      type: "suspicious_timing",
      score: FRAUD_THRESHOLDS.SCORE_SUSPICIOUS_TIMING,
      description: `Claim submitted at ${currentHour}:00 (unusual business hours)`,
      metadata: { hourOfDay: currentHour },
    };
    signals.push(signal);
    totalScore += signal.score;
  }

  // ============================================
  // CALCULATE RISK LEVEL & RECOMMENDATION
  // ============================================
  // Cap fraud score at 100
  const fraudScore = Math.min(totalScore, 100);

  let riskLevel: FraudAnalysisResult["riskLevel"];
  let recommendation: FraudAnalysisResult["recommendation"];
  let requiresManualReview: boolean;

  if (fraudScore <= FRAUD_THRESHOLDS.LOW_RISK) {
    riskLevel = "low";
    recommendation = "auto_approve"; // Can auto-approve after phone verification
    requiresManualReview = false;
  } else if (fraudScore <= FRAUD_THRESHOLDS.MEDIUM_RISK) {
    riskLevel = "medium";
    recommendation = "standard_review";
    requiresManualReview = true;
  } else if (fraudScore <= FRAUD_THRESHOLDS.HIGH_RISK) {
    riskLevel = "high";
    recommendation = "enhanced_review";
    requiresManualReview = true;
  } else {
    riskLevel = "critical";
    recommendation = "reject"; // Auto-reject or require intensive verification
    requiresManualReview = true;
  }

  return {
    fraudScore,
    riskLevel,
    signals,
    recommendation,
    requiresManualReview,
  };
}

/**
 * Check if claim should be flagged for manual review
 */
export function shouldFlagForReview(analysis: FraudAnalysisResult): boolean {
  return analysis.requiresManualReview;
}

/**
 * Get human-readable fraud report
 */
export function getFraudReport(analysis: FraudAnalysisResult): string {
  const report = [
    `Fraud Score: ${analysis.fraudScore}/100 (${analysis.riskLevel.toUpperCase()} RISK)`,
    `Recommendation: ${analysis.recommendation.replace("_", " ").toUpperCase()}`,
    "",
    "Detected Signals:",
  ];

  if (analysis.signals.length === 0) {
    report.push("- No fraud signals detected");
  } else {
    analysis.signals.forEach((signal) => {
      report.push(`- [${signal.score} pts] ${signal.description}`);
    });
  }

  return report.join("\n");
}

/**
 * Log fraud analysis to audit trail
 */
export function serializeFraudAnalysis(analysis: FraudAnalysisResult): string {
  return JSON.stringify({
    fraudScore: analysis.fraudScore,
    riskLevel: analysis.riskLevel,
    recommendation: analysis.recommendation,
    signalCount: analysis.signals.length,
    signals: analysis.signals.map((s) => ({
      type: s.type,
      score: s.score,
      description: s.description,
    })),
    timestamp: new Date().toISOString(),
  });
}

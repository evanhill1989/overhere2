"use server";

import { db } from "@/lib/db";
import {
  placeClaimsTable,
  claimAuditLogTable,
  checkinsTable,
  usersTable,
  verifiedOwnersTable,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  checkServerActionRateLimit,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/serverActionRateLimit";
import {
  claimPlaceFormSchema,
  businessInfoFormSchema,
  phoneVerificationFormSchema,
  cancelClaimFormSchema,
  adminReviewClaimFormSchema,
  type ClaimId,
  type UserId,
  type PlaceId,
  CLAIM_STATUS,
  CLAIM_AUDIT_ACTIONS,
} from "@/lib/types/database";
import {
  checkClaimEligibility,
  recordIpClaimAttempt,
} from "@/lib/security/claimRateLimiter";
import { CLAIM_LIMITS } from "@/lib/security/claimLimits";
import {
  calculateFraudScore,
  serializeFraudAnalysis,
} from "@/lib/services/fraudDetection";
import {
  sendVerificationCode,
  verifyPhoneCode,
  resendVerificationCode,
} from "@/lib/services/phoneVerification";
import { headers } from "next/headers";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get client IP address from headers
 */
async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "0.0.0.0"; // Fallback
}

/**
 * Get user agent from headers
 */
async function getUserAgent(): Promise<string> {
  const headersList = await headers();
  return headersList.get("user-agent") || "unknown";
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  claimId: ClaimId,
  action: string,
  actorId?: UserId,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(claimAuditLogTable).values({
    claimId,
    action,
    actorId: actorId || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

// ============================================
// CLAIM ACTIONS
// ============================================

/**
 * Start a new claim (Step 1)
 */
export async function startClaim(formData: unknown) {
  try {
    // Rate limit
    await checkServerActionRateLimit(RATE_LIMIT_CONFIGS.CLAIM_START);

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validated = claimPlaceFormSchema.parse(formData);
    const userId = user.id as UserId;
    const placeId = validated.placeId as PlaceId;

    // Get client info
    const ipAddress = await getClientIp();
    const userAgent = await getUserAgent();

    // Check eligibility
    const eligibility = await checkClaimEligibility(userId, placeId, ipAddress);
    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason || "Not eligible to claim this location",
        details: eligibility.details,
      };
    }

    // Verify check-in if provided
    let checkinIdAtClaim = validated.checkinId as string | null;
    if (checkinIdAtClaim) {
      const checkin = await db
        .select()
        .from(checkinsTable)
        .where(
          and(
            eq(checkinsTable.id, checkinIdAtClaim),
            eq(checkinsTable.userId, userId),
            eq(checkinsTable.placeId, placeId),
            eq(checkinsTable.isActive, true),
          ),
        )
        .limit(1);

      if (checkin.length === 0) {
        return {
          success: false,
          error: "Valid check-in required at this location",
        };
      }

      // Check if check-in is recent (within 24 hours)
      const checkinAge =
        (Date.now() - new Date(checkin[0].createdAt).getTime()) /
        (1000 * 60 * 60);
      if (checkinAge > 24) {
        return {
          success: false,
          error: "Check-in must be within the last 24 hours",
        };
      }
    }

    // Get user creation date for fraud check
    const userRecord = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (userRecord.length === 0) {
      return { success: false, error: "User not found" };
    }

    const userCreatedAt = new Date(userRecord[0].createdAt);

    // Check minimum account age
    const accountAgeInDays =
      (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeInDays < CLAIM_LIMITS.MIN_ACCOUNT_AGE_DAYS) {
      return {
        success: false,
        error: `Account must be at least ${CLAIM_LIMITS.MIN_ACCOUNT_AGE_DAYS} days old to claim ownership`,
      };
    }

    // Calculate initial fraud score
    const fraudAnalysis = await calculateFraudScore({
      userId,
      placeId,
      checkinId: checkinIdAtClaim || null,
      ipAddress,
      userAgent,
      userCreatedAt,
    });

    // Create claim
    const newClaim = await db
      .insert(placeClaimsTable)
      .values({
        userId,
        placeId,
        status: CLAIM_STATUS.PENDING,
        verificationMethod: "phone", // Default, will be set in business info step
        role: "owner", // Default
        checkinIdAtClaim: checkinIdAtClaim || null,
        ipAddress,
        userAgent,
        fraudScore: fraudAnalysis.fraudScore,
        adminReviewNotes: serializeFraudAnalysis(fraudAnalysis),
      })
      .returning();

    const claimId = newClaim[0].id as ClaimId;

    // Create audit log
    await createAuditLog(claimId, CLAIM_AUDIT_ACTIONS.CLAIM_STARTED, userId, {
      placeId,
      fraudScore: fraudAnalysis.fraudScore,
      riskLevel: fraudAnalysis.riskLevel,
    });

    // Record IP attempt
    await recordIpClaimAttempt(ipAddress);

    revalidatePath(`/claim/${claimId}`);

    return {
      success: true,
      claimId,
      fraudAnalysis: {
        score: fraudAnalysis.fraudScore,
        riskLevel: fraudAnalysis.riskLevel,
      },
    };
  } catch (error) {
    console.error("Error starting claim:", error);
    return { success: false, error: "Failed to start claim" };
  }
}

/**
 * Submit business info (Step 3)
 */
export async function submitBusinessInfo(formData: unknown) {
  try {
    // Rate limit
    await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.CLAIM_SUBMIT_BUSINESS_INFO,
    );

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validated = businessInfoFormSchema.parse(formData);
    const claimId = validated.claimId as ClaimId;
    const userId = user.id as UserId;

    // Verify claim ownership
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.id, claimId),
          eq(placeClaimsTable.userId, userId),
        ),
      )
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    if (claim[0].status !== CLAIM_STATUS.PENDING) {
      return { success: false, error: "Claim already processed" };
    }

    // Update claim with business info
    await db
      .update(placeClaimsTable)
      .set({
        role: validated.role,
        businessEmail: validated.businessEmail,
        businessDescription: validated.businessDescription,
        yearsAtLocation: validated.yearsAtLocation,
        phoneNumber: validated.phoneNumber,
      })
      .where(eq(placeClaimsTable.id, claimId));

    // Create audit log
    await createAuditLog(
      claimId,
      CLAIM_AUDIT_ACTIONS.BUSINESS_INFO_SUBMITTED,
      userId,
      {
        role: validated.role,
        yearsAtLocation: validated.yearsAtLocation,
      },
    );

    revalidatePath(`/claim/${claimId}`);

    return { success: true };
  } catch (error) {
    console.error("Error submitting business info:", error);
    return { success: false, error: "Failed to submit business info" };
  }
}

/**
 * Send phone verification code (Step 4)
 */
export async function sendPhoneVerificationCode(claimId: string) {
  try {
    // Rate limit
    await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.CLAIM_SEND_VERIFICATION_CODE,
    );

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = user.id as UserId;
    const claimIdTyped = claimId as ClaimId;

    // Verify claim ownership
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.id, claimIdTyped),
          eq(placeClaimsTable.userId, userId),
        ),
      )
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    if (!claim[0].phoneNumber) {
      return { success: false, error: "Phone number not provided" };
    }

    // Send verification code
    const result = await sendVerificationCode(
      claimIdTyped,
      claim[0].phoneNumber,
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Create audit log
    await createAuditLog(
      claimIdTyped,
      CLAIM_AUDIT_ACTIONS.PHONE_CODE_SENT,
      userId,
      {
        phoneNumber: claim[0].phoneNumber,
      },
    );

    revalidatePath(`/claim/${claimId}`);

    return { success: true };
  } catch (error) {
    console.error("Error sending verification code:", error);
    return { success: false, error: "Failed to send verification code" };
  }
}

/**
 * Verify phone code (Step 4)
 */
export async function verifyPhone(formData: unknown) {
  try {
    // Rate limit
    await checkServerActionRateLimit(RATE_LIMIT_CONFIGS.CLAIM_VERIFY_CODE);

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validated = phoneVerificationFormSchema.parse(formData);
    const claimId = validated.claimId as ClaimId;
    const userId = user.id as UserId;

    // Verify claim ownership
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.id, claimId),
          eq(placeClaimsTable.userId, userId),
        ),
      )
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    // Verify code
    const result = await verifyPhoneCode(claimId, validated.code);

    if (!result.success) {
      // Log failed attempt
      await createAuditLog(
        claimId,
        CLAIM_AUDIT_ACTIONS.PHONE_CODE_FAILED,
        userId,
        {
          attemptsRemaining: result.attemptsRemaining,
          error: result.error,
        },
      );

      return {
        success: false,
        error: result.error,
        attemptsRemaining: result.attemptsRemaining,
      };
    }

    if (!result.verified) {
      return {
        success: false,
        error: result.error || "Invalid verification code",
        attemptsRemaining: result.attemptsRemaining,
      };
    }

    // Update verification method
    await db
      .update(placeClaimsTable)
      .set({
        verificationMethod: "phone",
      })
      .where(eq(placeClaimsTable.id, claimId));

    // Create audit log
    await createAuditLog(
      claimId,
      CLAIM_AUDIT_ACTIONS.PHONE_CODE_VERIFIED,
      userId,
    );

    revalidatePath(`/claim/${claimId}`);

    return { success: true };
  } catch (error) {
    console.error("Error verifying phone:", error);
    return { success: false, error: "Failed to verify phone" };
  }
}

/**
 * Resend verification code
 */
export async function resendPhoneVerificationCode(claimId: string) {
  try {
    // Rate limit
    await checkServerActionRateLimit(RATE_LIMIT_CONFIGS.CLAIM_RESEND_CODE);

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = user.id as UserId;
    const claimIdTyped = claimId as ClaimId;

    // Verify claim ownership
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.id, claimIdTyped),
          eq(placeClaimsTable.userId, userId),
        ),
      )
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    // Resend code
    const result = await resendVerificationCode(claimIdTyped);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath(`/claim/${claimId}`);

    return { success: true };
  } catch (error) {
    console.error("Error resending verification code:", error);
    return { success: false, error: "Failed to resend verification code" };
  }
}

/**
 * Submit final claim (Step 5)
 */
export async function submitClaim(claimId: string) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = user.id as UserId;
    const claimIdTyped = claimId as ClaimId;

    // Verify claim ownership
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.id, claimIdTyped),
          eq(placeClaimsTable.userId, userId),
        ),
      )
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    if (claim[0].status !== CLAIM_STATUS.PENDING) {
      return { success: false, error: "Claim already processed" };
    }

    // Verify all required steps completed
    if (
      !claim[0].businessEmail ||
      !claim[0].phoneNumber ||
      !claim[0].businessDescription
    ) {
      return { success: false, error: "Please complete all required steps" };
    }

    // No additional status change needed - stays pending for admin review
    // Just mark as "submitted" in audit log
    await createAuditLog(
      claimIdTyped,
      CLAIM_AUDIT_ACTIONS.CLAIM_SUBMITTED,
      userId,
      {
        fraudScore: claim[0].fraudScore,
      },
    );

    revalidatePath(`/claim/${claimId}`);
    revalidatePath(`/claim/${claimId}/status`);

    return { success: true };
  } catch (error) {
    console.error("Error submitting claim:", error);
    return { success: false, error: "Failed to submit claim" };
  }
}

/**
 * Cancel claim
 */
export async function cancelClaim(formData: unknown) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validated = cancelClaimFormSchema.parse(formData);
    const claimId = validated.claimId as ClaimId;
    const userId = user.id as UserId;

    // Verify claim ownership
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.id, claimId),
          eq(placeClaimsTable.userId, userId),
        ),
      )
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    if (claim[0].status !== CLAIM_STATUS.PENDING) {
      return { success: false, error: "Cannot cancel processed claim" };
    }

    // Update status to canceled (using rejected status with note)
    await db
      .update(placeClaimsTable)
      .set({
        status: CLAIM_STATUS.REJECTED,
        rejectionReason: "Canceled by user",
      })
      .where(eq(placeClaimsTable.id, claimId));

    // Create audit log
    await createAuditLog(claimId, CLAIM_AUDIT_ACTIONS.CLAIM_CANCELED, userId);

    revalidatePath(`/claim/${claimId}`);

    return { success: true };
  } catch (error) {
    console.error("Error canceling claim:", error);
    return { success: false, error: "Failed to cancel claim" };
  }
}

// ============================================
// ADMIN ACTIONS
// ============================================

/**
 * Admin: Review and approve/reject claim
 */
export async function adminReviewClaim(formData: unknown) {
  try {
    // Auth check (in production, add admin role check)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // TODO: Add admin role check here
    // const isAdmin = await checkUserIsAdmin(user.id);
    // if (!isAdmin) {
    //   return { success: false, error: "Forbidden" };
    // }

    // Validate input
    const validated = adminReviewClaimFormSchema.parse(formData);
    const claimId = validated.claimId as ClaimId;
    const userId = user.id as UserId;

    // Get claim
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(eq(placeClaimsTable.id, claimId))
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    if (claim[0].status !== CLAIM_STATUS.PENDING) {
      return { success: false, error: "Claim already processed" };
    }

    const now = new Date();

    if (validated.action === CLAIM_STATUS.VERIFIED) {
      // Approve claim
      await db
        .update(placeClaimsTable)
        .set({
          status: CLAIM_STATUS.VERIFIED,
          verifiedAt: now,
          adminReviewNotes: validated.adminNotes || null,
        })
        .where(eq(placeClaimsTable.id, claimId));

      // Create verified owner entry
      await db.insert(verifiedOwnersTable).values({
        placeId: claim[0].placeId,
        userId: claim[0].userId,
        role: claim[0].role,
        subscriptionStatus: "trialing", // Default to trial
      });

      // Create audit log
      await createAuditLog(
        claimId,
        CLAIM_AUDIT_ACTIONS.CLAIM_APPROVED,
        userId,
        { adminNotes: validated.adminNotes },
      );

      revalidatePath(`/dashboard/places/${claim[0].placeId}`);
    } else {
      // Reject claim
      await db
        .update(placeClaimsTable)
        .set({
          status: CLAIM_STATUS.REJECTED,
          rejectionReason: validated.rejectionReason || "Rejected by admin",
          adminReviewNotes: validated.adminNotes || null,
        })
        .where(eq(placeClaimsTable.id, claimId));

      // Create audit log
      await createAuditLog(
        claimId,
        CLAIM_AUDIT_ACTIONS.CLAIM_REJECTED,
        userId,
        {
          rejectionReason: validated.rejectionReason,
          adminNotes: validated.adminNotes,
        },
      );
    }

    revalidatePath(`/claim/${claimId}`);
    revalidatePath(`/admin/claims`);

    return { success: true };
  } catch (error) {
    console.error("Error reviewing claim:", error);
    return { success: false, error: "Failed to review claim" };
  }
}

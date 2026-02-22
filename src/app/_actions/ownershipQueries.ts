"use server";

import { db } from "@/lib/db";
import {
  placeClaimsTable,
  claimAuditLogTable,
  verifiedOwnersTable,
  placeOwnerSettingsTable,
  checkinsTable,
  placesTable,
  usersTable,
} from "@/lib/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import type { UserId, PlaceId, ClaimId } from "@/lib/types/database";
import { checkUserClaimEligibility } from "@/lib/security/claimRateLimiter";

// ============================================
// QUERY ACTIONS
// ============================================

/**
 * Get user's claims
 */
export async function getUserClaims(userId?: string) {
  try {
    // If no userId provided, get from session
    let userIdToQuery = userId as UserId | undefined;

    if (!userIdToQuery) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: "Unauthorized" };
      }

      userIdToQuery = user.id as UserId;
    }

    const claims = await db
      .select({
        id: placeClaimsTable.id,
        placeId: placeClaimsTable.placeId,
        placeName: placesTable.name,
        placeAddress: placesTable.address,
        status: placeClaimsTable.status,
        role: placeClaimsTable.role,
        submittedAt: placeClaimsTable.submittedAt,
        verifiedAt: placeClaimsTable.verifiedAt,
        rejectionReason: placeClaimsTable.rejectionReason,
        fraudScore: placeClaimsTable.fraudScore,
      })
      .from(placeClaimsTable)
      .leftJoin(placesTable, eq(placeClaimsTable.placeId, placesTable.id))
      .where(eq(placeClaimsTable.userId, userIdToQuery))
      .orderBy(desc(placeClaimsTable.submittedAt));

    return { success: true, claims };
  } catch (error) {
    console.error("Error getting user claims:", error);
    return { success: false, error: "Failed to get claims" };
  }
}

/**
 * Get claim details by ID
 */
export async function getClaimById(claimId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const claimIdTyped = claimId as ClaimId;
    const userId = user.id as UserId;

    const claim = await db
      .select({
        id: placeClaimsTable.id,
        placeId: placeClaimsTable.placeId,
        placeName: placesTable.name,
        placeAddress: placesTable.address,
        userId: placeClaimsTable.userId,
        status: placeClaimsTable.status,
        role: placeClaimsTable.role,
        businessEmail: placeClaimsTable.businessEmail,
        businessDescription: placeClaimsTable.businessDescription,
        yearsAtLocation: placeClaimsTable.yearsAtLocation,
        phoneNumber: placeClaimsTable.phoneNumber,
        verificationMethod: placeClaimsTable.verificationMethod,
        verificationCodeAttempts: placeClaimsTable.verificationCodeAttempts,
        submittedAt: placeClaimsTable.submittedAt,
        verifiedAt: placeClaimsTable.verifiedAt,
        rejectionReason: placeClaimsTable.rejectionReason,
        fraudScore: placeClaimsTable.fraudScore,
        adminReviewNotes: placeClaimsTable.adminReviewNotes,
      })
      .from(placeClaimsTable)
      .leftJoin(placesTable, eq(placeClaimsTable.placeId, placesTable.id))
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

    return { success: true, claim: claim[0] };
  } catch (error) {
    console.error("Error getting claim:", error);
    return { success: false, error: "Failed to get claim" };
  }
}

/**
 * Get claim audit log
 */
export async function getClaimAuditLog(claimId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const claimIdTyped = claimId as ClaimId;

    // Verify user owns this claim
    const claim = await db
      .select()
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.id, claimIdTyped),
          eq(placeClaimsTable.userId, user.id as UserId),
        ),
      )
      .limit(1);

    if (claim.length === 0) {
      return { success: false, error: "Claim not found" };
    }

    const auditLog = await db
      .select({
        id: claimAuditLogTable.id,
        action: claimAuditLogTable.action,
        actorId: claimAuditLogTable.actorId,
        actorName: usersTable.name,
        metadata: claimAuditLogTable.metadata,
        createdAt: claimAuditLogTable.createdAt,
      })
      .from(claimAuditLogTable)
      .leftJoin(usersTable, eq(claimAuditLogTable.actorId, usersTable.id))
      .where(eq(claimAuditLogTable.claimId, claimIdTyped))
      .orderBy(desc(claimAuditLogTable.createdAt));

    return { success: true, auditLog };
  } catch (error) {
    console.error("Error getting audit log:", error);
    return { success: false, error: "Failed to get audit log" };
  }
}

/**
 * Check claim eligibility before starting
 */
export async function checkClaimEligibilityForUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = user.id as UserId;

    const eligibility = await checkUserClaimEligibility(userId);

    return {
      success: true,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      details: eligibility.details,
    };
  } catch (error) {
    console.error("Error checking eligibility:", error);
    return { success: false, error: "Failed to check eligibility" };
  }
}

/**
 * Get place ownership status
 */
export async function getPlaceOwnershipStatus(placeId: string) {
  try {
    const placeIdTyped = placeId as PlaceId;

    // Check for verified owner
    const verifiedOwner = await db
      .select({
        id: verifiedOwnersTable.id,
        userId: verifiedOwnersTable.userId,
        userName: usersTable.name,
        role: verifiedOwnersTable.role,
        subscriptionStatus: verifiedOwnersTable.subscriptionStatus,
        createdAt: verifiedOwnersTable.createdAt,
      })
      .from(verifiedOwnersTable)
      .leftJoin(usersTable, eq(verifiedOwnersTable.userId, usersTable.id))
      .where(eq(verifiedOwnersTable.placeId, placeIdTyped))
      .limit(1);

    // Check for pending claims
    const pendingClaims = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(placeClaimsTable)
      .where(
        and(
          eq(placeClaimsTable.placeId, placeIdTyped),
          eq(placeClaimsTable.status, "pending"),
        ),
      );

    return {
      success: true,
      hasVerifiedOwner: verifiedOwner.length > 0,
      verifiedOwner: verifiedOwner[0] || null,
      pendingClaimsCount: Number(pendingClaims[0]?.count ?? 0),
    };
  } catch (error) {
    console.error("Error getting ownership status:", error);
    return { success: false, error: "Failed to get ownership status" };
  }
}

/**
 * Get user's active check-ins for claim selection
 */
export async function getUserActiveCheckins() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = user.id as UserId;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const checkins = await db
      .select({
        id: checkinsTable.id,
        placeId: checkinsTable.placeId,
        placeName: checkinsTable.placeName,
        placeAddress: checkinsTable.placeAddress,
        createdAt: checkinsTable.createdAt,
        checkinStatus: checkinsTable.checkinStatus,
      })
      .from(checkinsTable)
      .where(
        and(
          eq(checkinsTable.userId, userId),
          eq(checkinsTable.isActive, true),
          gte(checkinsTable.createdAt, twentyFourHoursAgo), // ← Drizzle handles conversion
        ),
      )
      .orderBy(desc(checkinsTable.createdAt));

    return {
      success: true,
      checkins: checkins.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(), // ← Convert Date to string
      })),
    };
  } catch (error) {
    console.error("Error getting active check-ins:", error);
    return { success: false, error: "Failed to get check-ins" };
  }
}

/**
 * Admin: Get all pending claims
 */
export async function getAllPendingClaims() {
  try {
    // Auth check (in production, add admin role check)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // TODO: Add admin role check

    const claims = await db
      .select({
        id: placeClaimsTable.id,
        placeId: placeClaimsTable.placeId,
        placeName: placesTable.name,
        placeAddress: placesTable.address,
        userId: placeClaimsTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
        status: placeClaimsTable.status,
        role: placeClaimsTable.role,
        businessEmail: placeClaimsTable.businessEmail,
        phoneNumber: placeClaimsTable.phoneNumber,
        fraudScore: placeClaimsTable.fraudScore,
        submittedAt: placeClaimsTable.submittedAt,
      })
      .from(placeClaimsTable)
      .leftJoin(placesTable, eq(placeClaimsTable.placeId, placesTable.id))
      .leftJoin(usersTable, eq(placeClaimsTable.userId, usersTable.id))
      .where(eq(placeClaimsTable.status, "pending"))
      .orderBy(
        desc(placeClaimsTable.fraudScore),
        desc(placeClaimsTable.submittedAt),
      );

    return { success: true, claims };
  } catch (error) {
    console.error("Error getting pending claims:", error);
    return { success: false, error: "Failed to get pending claims" };
  }
}

export async function getPlaceVerificationDetails(placeId: PlaceId) {
  try {
    // Check if place has verified owner
    const verifiedOwner = await db
      .select({
        role: verifiedOwnersTable.role,
        userId: verifiedOwnersTable.userId,
        createdAt: verifiedOwnersTable.createdAt,
      })
      .from(verifiedOwnersTable)
      .where(eq(verifiedOwnersTable.placeId, placeId))
      .limit(1);

    if (verifiedOwner.length === 0) {
      return {
        success: true,
        isVerified: false,
      };
    }

    // Get owner settings (custom description + contact info)
    const settings = await db
      .select({
        descriptionOverride: placeOwnerSettingsTable.descriptionOverride,
        publicWebsite: placeOwnerSettingsTable.publicWebsite,
        publicPhone: placeOwnerSettingsTable.publicPhone,
        publicEmail: placeOwnerSettingsTable.publicEmail,
      })
      .from(placeOwnerSettingsTable)
      .where(eq(placeOwnerSettingsTable.placeId, placeId))
      .limit(1);

    return {
      success: true,
      isVerified: true,
      verifiedOwner: {
        role: verifiedOwner[0].role,
        verifiedAt: verifiedOwner[0].createdAt.toISOString(),
      },
      businessContact: settings[0]
        ? {
            website: settings[0].publicWebsite,
            phone: settings[0].publicPhone,
            email: settings[0].publicEmail,
          }
        : null,
      customDescription: settings[0]?.descriptionOverride || null,
    };
  } catch (error) {
    console.error("Error fetching verification details:", error);
    return { success: false, error: "Failed to fetch verification details" };
  }
}

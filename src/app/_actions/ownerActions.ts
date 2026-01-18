// src/app/_actions/ownerActions.ts
"use server";

import { db } from "@/lib/db";
import {
  placeClaimsTable,
  verifiedOwnersTable,
  placeOwnerSettingsTable,
  promotionsTable,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import {
  checkServerActionRateLimit,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/serverActionRateLimit";
import {
  type UserId,
  type PlaceId,
  type ClaimId,
  type PlaceClaim,
  type VerifiedOwner,
  type PlaceOwnerSettings,
  type Promotion,
  userIdSchema,
  placeIdSchema,
  claimIdSchema,
  promotionIdSchema,
  placeClaimSchema,
  verifiedOwnerSchema,
  placeOwnerSettingsSchema,
  promotionSchema,
  claimPlaceFormSchema,
  verifyPhoneCodeFormSchema,
  updateOwnerSettingsFormSchema,
  createPromotionFormSchema,
  CLAIM_STATUS,
  VERIFICATION_METHOD,
  OWNER_ROLE,
  SUBSCRIPTION_STATUS,
  PROMOTION_STATUS,
} from "@/lib/types/database";
import {
  requirePlaceOwner,
  isPlaceOwner,
  hasPendingClaim,
} from "@/lib/auth/ownershipAuth";
import type { ApiResponse } from "@/lib/types/api";

// ============================================
// CLAIM PLACE OWNERSHIP
// ============================================

export async function claimPlace(input: {
  placeId: string;
  verificationMethod: string;
  phoneNumber?: string;
}): Promise<ApiResponse<{ claimId: ClaimId }>> {
  try {
    // Rate limiting
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.CHECKIN_CREATE, // Reuse existing config
    );

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: rateLimitResult.error || "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        code: "AUTHENTICATION_ERROR",
      };
    }

    // Validate input
    const validatedInput = claimPlaceFormSchema.parse(input);
    const userId = userIdSchema.parse(user.id);
    const placeId = placeIdSchema.parse(validatedInput.placeId);

    // Check if user already owns this place
    const alreadyOwner = await isPlaceOwner(userId, placeId);
    if (alreadyOwner) {
      return {
        success: false,
        error: "You already own this place",
        code: "CONFLICT",
      };
    }

    // Check for pending claim
    const pendingClaim = await hasPendingClaim(userId, placeId);
    if (pendingClaim) {
      return {
        success: false,
        error: "You already have a pending claim for this place",
        code: "CONFLICT",
      };
    }

    // Generate verification code for phone verification
    let verificationCode: string | null = null;
    let verificationCodeExpiresAt: Date | null = null;

    if (validatedInput.verificationMethod === VERIFICATION_METHOD.PHONE) {
      if (!validatedInput.phoneNumber) {
        return {
          success: false,
          error: "Phone number required for phone verification",
          code: "VALIDATION_ERROR",
        };
      }

      // Generate 6-digit code
      verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // TODO: Send SMS with verification code
      console.log(
        `📱 Verification code for ${validatedInput.phoneNumber}: ${verificationCode}`,
      );
    }

    // Create claim record
    const [newClaim] = await db
      .insert(placeClaimsTable)
      .values({
        placeId,
        userId,
        status: CLAIM_STATUS.PENDING,
        verificationMethod: validatedInput.verificationMethod,
        phoneNumber: validatedInput.phoneNumber || null,
        verificationCode,
        verificationCodeExpiresAt,
      })
      .returning();

    const claimId = claimIdSchema.parse(newClaim.id);

    return {
      success: true,
      data: { claimId },
      message:
        validatedInput.verificationMethod === VERIFICATION_METHOD.PHONE
          ? "Verification code sent to your phone"
          : "Claim submitted for review",
    };
  } catch (error) {
    console.error("❌ Error claiming place:", error);
    return {
      success: false,
      error: "Failed to claim place",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// VERIFY PHONE CODE
// ============================================

export async function verifyPhoneCode(input: {
  claimId: string;
  code: string;
}): Promise<ApiResponse<{ verifiedOwnerId: string }>> {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        code: "AUTHENTICATION_ERROR",
      };
    }

    // Validate input
    const validatedInput = verifyPhoneCodeFormSchema.parse(input);
    const userId = userIdSchema.parse(user.id);
    const claimId = claimIdSchema.parse(validatedInput.claimId);

    // Fetch claim
    const claim = await db.query.placeClaimsTable.findFirst({
      where: and(
        eq(placeClaimsTable.id, claimId),
        eq(placeClaimsTable.userId, userId),
      ),
    });

    if (!claim) {
      return {
        success: false,
        error: "Claim not found",
        code: "NOT_FOUND",
      };
    }

    // Verify claim is pending
    if (claim.status !== CLAIM_STATUS.PENDING) {
      return {
        success: false,
        error: "Claim already processed",
        code: "CONFLICT",
      };
    }

    // Verify code matches
    if (claim.verificationCode !== validatedInput.code) {
      return {
        success: false,
        error: "Invalid verification code",
        code: "VALIDATION_ERROR",
      };
    }

    // Verify code not expired
    if (
      !claim.verificationCodeExpiresAt ||
      new Date() > claim.verificationCodeExpiresAt
    ) {
      return {
        success: false,
        error: "Verification code expired",
        code: "VALIDATION_ERROR",
      };
    }

    // Update claim status
    await db
      .update(placeClaimsTable)
      .set({
        status: CLAIM_STATUS.VERIFIED,
        verifiedAt: new Date(),
      })
      .where(eq(placeClaimsTable.id, claimId));

    // Create verified owner record
    const [newOwner] = await db
      .insert(verifiedOwnersTable)
      .values({
        placeId: claim.placeId,
        userId: claim.userId,
        role: OWNER_ROLE.OWNER,
        subscriptionStatus: SUBSCRIPTION_STATUS.TRIALING,
      })
      .returning();

    return {
      success: true,
      data: { verifiedOwnerId: newOwner.id },
      message: "Place verified successfully",
    };
  } catch (error) {
    console.error("❌ Error verifying phone code:", error);
    return {
      success: false,
      error: "Failed to verify code",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// UPDATE OWNER SETTINGS
// ============================================

export async function updateOwnerSettings(input: {
  placeId: string;
  descriptionOverride?: string | null;
  announcementText?: string | null;
  announcementExpiresAt?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}): Promise<ApiResponse<{ settings: PlaceOwnerSettings }>> {
  try {
    // Rate limiting
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.CHECKIN_CREATE,
    );

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: rateLimitResult.error || "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        code: "AUTHENTICATION_ERROR",
      };
    }

    // Validate input
    const validatedInput = updateOwnerSettingsFormSchema.parse(input);
    const userId = userIdSchema.parse(user.id);
    const placeId = placeIdSchema.parse(validatedInput.placeId);

    // Authorization check
    await requirePlaceOwner(userId, placeId);

    // Upsert settings
    const [updatedSettings] = await db
      .insert(placeOwnerSettingsTable)
      .values({
        placeId,
        descriptionOverride: validatedInput.descriptionOverride || null,
        announcementText: validatedInput.announcementText || null,
        announcementExpiresAt: validatedInput.announcementExpiresAt
          ? new Date(validatedInput.announcementExpiresAt)
          : null,
        contactEmail: validatedInput.contactEmail || null,
        contactPhone: validatedInput.contactPhone || null,
        lastUpdatedBy: userId,
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: placeOwnerSettingsTable.placeId,
        set: {
          descriptionOverride: validatedInput.descriptionOverride || null,
          announcementText: validatedInput.announcementText || null,
          announcementExpiresAt: validatedInput.announcementExpiresAt
            ? new Date(validatedInput.announcementExpiresAt)
            : null,
          contactEmail: validatedInput.contactEmail || null,
          contactPhone: validatedInput.contactPhone || null,
          lastUpdatedBy: userId,
          lastUpdatedAt: new Date(),
        },
      })
      .returning();

    const settings = placeOwnerSettingsSchema.parse({
      placeId: updatedSettings.placeId,
      descriptionOverride: updatedSettings.descriptionOverride,
      announcementText: updatedSettings.announcementText,
      announcementExpiresAt: updatedSettings.announcementExpiresAt,
      contactEmail: updatedSettings.contactEmail,
      contactPhone: updatedSettings.contactPhone,
      lastUpdatedBy: updatedSettings.lastUpdatedBy,
      lastUpdatedAt: updatedSettings.lastUpdatedAt,
    });

    return {
      success: true,
      data: { settings },
      message: "Settings updated successfully",
    };
  } catch (error) {
    console.error("❌ Error updating owner settings:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update settings",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// CREATE PROMOTION
// ============================================

export async function createPromotion(input: {
  placeId: string;
  type: string;
  title?: string;
  message?: string;
  startAt: string;
  endAt: string;
}): Promise<ApiResponse<{ promotion: Promotion }>> {
  try {
    // Rate limiting
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.CHECKIN_CREATE,
    );

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: rateLimitResult.error || "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        code: "AUTHENTICATION_ERROR",
      };
    }

    // Validate input
    const validatedInput = createPromotionFormSchema.parse(input);
    const userId = userIdSchema.parse(user.id);
    const placeId = placeIdSchema.parse(validatedInput.placeId);

    // Authorization check
    await requirePlaceOwner(userId, placeId);

    // Create promotion
    const [newPromotion] = await db
      .insert(promotionsTable)
      .values({
        placeId,
        type: validatedInput.type,
        title: validatedInput.title || null,
        message: validatedInput.message || null,
        startAt: new Date(validatedInput.startAt),
        endAt: new Date(validatedInput.endAt),
        status: PROMOTION_STATUS.SCHEDULED,
        createdBy: userId,
      })
      .returning();

    const promotion = promotionSchema.parse({
      id: newPromotion.id,
      placeId: newPromotion.placeId,
      type: newPromotion.type,
      title: newPromotion.title,
      message: newPromotion.message,
      startAt: newPromotion.startAt,
      endAt: newPromotion.endAt,
      status: newPromotion.status,
      createdBy: newPromotion.createdBy,
      createdAt: newPromotion.createdAt,
    });

    return {
      success: true,
      data: { promotion },
      message: "Promotion created successfully",
    };
  } catch (error) {
    console.error("❌ Error creating promotion:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create promotion",
      code: "INTERNAL_ERROR",
    };
  }
}

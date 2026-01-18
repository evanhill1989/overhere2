// src/app/_actions/ownerQueries.ts
"use server";

import { db } from "@/lib/db";
import {
  verifiedOwnersTable,
  placeOwnerSettingsTable,
  promotionsTable,
  checkinsTable,
  messageSessionsTable,
} from "@/lib/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import {
  type UserId,
  type PlaceId,
  type VerifiedOwner,
  type PlaceOwnerSettings,
  type Promotion,
  userIdSchema,
  placeIdSchema,
  verifiedOwnerSchema,
  placeOwnerSettingsSchema,
  promotionSchema,
} from "@/lib/types/database";
import {
  requirePlaceOwner,
  getUserOwnedPlaces,
} from "@/lib/auth/ownershipAuth";
import type { ApiResponse } from "@/lib/types/api";

export async function getOwnerDashboard(input: { placeId: string }): Promise<
  ApiResponse<{
    ownership: VerifiedOwner;
    settings: PlaceOwnerSettings | null;
    analytics: {
      activeCheckins: number;
      activeSessions: number;
      totalCheckinsToday: number;
    };
  }>
> {
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

    const userId = userIdSchema.parse(user.id);
    const placeId = placeIdSchema.parse(input.placeId);

    // Authorization check
    await requirePlaceOwner(userId, placeId);

    // Fetch ownership record
    const ownership = await db.query.verifiedOwnersTable.findFirst({
      where: and(
        eq(verifiedOwnersTable.userId, userId),
        eq(verifiedOwnersTable.placeId, placeId),
      ),
    });

    if (!ownership) {
      return {
        success: false,
        error: "Ownership record not found",
        code: "NOT_FOUND",
      };
    }

    // Fetch settings
    const settings = await db.query.placeOwnerSettingsTable.findFirst({
      where: eq(placeOwnerSettingsTable.placeId, placeId),
    });

    // Calculate analytics
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const [activeCheckinsResult] = await db
      .select({ count: count() })
      .from(checkinsTable)
      .where(
        and(
          eq(checkinsTable.placeId, placeId),
          eq(checkinsTable.isActive, true),
        ),
      );

    const [activeSessionsResult] = await db
      .select({ count: count() })
      .from(messageSessionsTable)
      .where(
        and(
          eq(messageSessionsTable.placeId, placeId),
          eq(messageSessionsTable.status, "active"),
        ),
      );

    const [totalCheckinsTodayResult] = await db
      .select({ count: count() })
      .from(checkinsTable)
      .where(
        and(
          eq(checkinsTable.placeId, placeId),
          gte(checkinsTable.createdAt, todayStart),
        ),
      );

    return {
      success: true,
      data: {
        ownership: verifiedOwnerSchema.parse({
          id: ownership.id,
          placeId: ownership.placeId,
          userId: ownership.userId,
          role: ownership.role,
          stripeCustomerId: ownership.stripeCustomerId,
          stripeSubscriptionId: ownership.stripeSubscriptionId,
          subscriptionStatus: ownership.subscriptionStatus,
          subscriptionCurrentPeriodEnd: ownership.subscriptionCurrentPeriodEnd,
          createdAt: ownership.createdAt,
        }),
        settings: settings
          ? placeOwnerSettingsSchema.parse({
              placeId: settings.placeId,
              descriptionOverride: settings.descriptionOverride,
              announcementText: settings.announcementText,
              announcementExpiresAt: settings.announcementExpiresAt,
              contactEmail: settings.contactEmail,
              contactPhone: settings.contactPhone,
              lastUpdatedBy: settings.lastUpdatedBy,
              lastUpdatedAt: settings.lastUpdatedAt,
            })
          : null,
        analytics: {
          activeCheckins: activeCheckinsResult.count,
          activeSessions: activeSessionsResult.count,
          totalCheckinsToday: totalCheckinsTodayResult.count,
        },
      },
    };
  } catch (error) {
    console.error("❌ Error fetching owner dashboard:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard data",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// GET USER'S OWNED PLACES
// ============================================

export async function getMyOwnedPlaces(): Promise<
  ApiResponse<{ ownedPlaces: VerifiedOwner[] }>
> {
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

    const userId = userIdSchema.parse(user.id);

    // Fetch owned places
    const ownedPlaces = await getUserOwnedPlaces(userId);

    return {
      success: true,
      data: { ownedPlaces },
    };
  } catch (error) {
    console.error("❌ Error fetching owned places:", error);
    return {
      success: false,
      error: "Failed to fetch owned places",
      code: "INTERNAL_ERROR",
    };
  }
}

// ============================================
// GET PLACE PROMOTIONS
// ============================================

export async function getPlacePromotions(input: {
  placeId: string;
}): Promise<ApiResponse<{ promotions: Promotion[] }>> {
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

    const userId = userIdSchema.parse(user.id);
    const placeId = placeIdSchema.parse(input.placeId);

    // Authorization check
    await requirePlaceOwner(userId, placeId);

    // Fetch promotions
    const promotions = await db.query.promotionsTable.findMany({
      where: eq(promotionsTable.placeId, placeId),
      orderBy: (promotions, { desc }) => [desc(promotions.createdAt)],
    });

    return {
      success: true,
      data: {
        promotions: promotions.map((promo) =>
          promotionSchema.parse({
            id: promo.id,
            placeId: promo.placeId,
            type: promo.type,
            title: promo.title,
            message: promo.message,
            startAt: promo.startAt,
            endAt: promo.endAt,
            status: promo.status,
            createdBy: promo.createdBy,
            createdAt: promo.createdAt,
          }),
        ),
      },
    };
  } catch (error) {
    console.error("❌ Error fetching promotions:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch promotions",
      code: "INTERNAL_ERROR",
    };
  }
}

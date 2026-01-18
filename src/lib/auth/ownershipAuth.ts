// src/lib/auth/ownershipAuth.ts
import { db } from "@/lib/db";
import { verifiedOwnersTable, placeClaimsTable } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  type UserId,
  type PlaceId,
  type VerifiedOwner,
  userIdSchema,
  placeIdSchema,
  verifiedOwnerSchema,
  SUBSCRIPTION_STATUS,
} from "@/lib/types/database";

export async function isPlaceOwner(
  userId: UserId,
  placeId: PlaceId,
): Promise<boolean> {
  try {
    const ownership = await db.query.verifiedOwnersTable.findFirst({
      where: and(
        eq(verifiedOwnersTable.userId, userId),
        eq(verifiedOwnersTable.placeId, placeId),
      ),
    });

    return !!ownership;
  } catch (error) {
    console.error("❌ Error checking place ownership:", error);
    return false;
  }
}

/**
 * Get verified owner record for a user and place
 * @param userId - The user ID
 * @param placeId - The place ID
 * @returns VerifiedOwner record or null if not found
 */
export async function getVerifiedOwner(
  userId: UserId,
  placeId: PlaceId,
): Promise<VerifiedOwner | null> {
  try {
    const ownership = await db.query.verifiedOwnersTable.findFirst({
      where: and(
        eq(verifiedOwnersTable.userId, userId),
        eq(verifiedOwnersTable.placeId, placeId),
      ),
    });

    if (!ownership) {
      return null;
    }

    // Parse and validate with Zod to ensure branded types
    return verifiedOwnerSchema.parse({
      id: ownership.id,
      placeId: ownership.placeId,
      userId: ownership.userId,
      role: ownership.role,
      stripeCustomerId: ownership.stripeCustomerId,
      stripeSubscriptionId: ownership.stripeSubscriptionId,
      subscriptionStatus: ownership.subscriptionStatus,
      subscriptionCurrentPeriodEnd: ownership.subscriptionCurrentPeriodEnd,
      createdAt: ownership.createdAt,
    });
  } catch (error) {
    console.error("❌ Error fetching verified owner:", error);
    return null;
  }
}

/**
 * Require place ownership - throws error if not authorized
 * Use this in server actions to gate access
 * @param userId - The user ID
 * @param placeId - The place ID
 * @throws Error if user is not a verified owner
 */
export async function requirePlaceOwner(
  userId: UserId,
  placeId: PlaceId,
): Promise<void> {
  const isOwner = await isPlaceOwner(userId, placeId);
  if (!isOwner) {
    throw new Error("Unauthorized: User is not a verified owner of this place");
  }
}

/**
 * Check if a user has an active subscription for a place
 * @param userId - The user ID
 * @param placeId - The place ID
 * @returns true if subscription is active, false otherwise
 */
export async function hasActiveSubscription(
  userId: UserId,
  placeId: PlaceId,
): Promise<boolean> {
  try {
    const ownership = await db.query.verifiedOwnersTable.findFirst({
      where: and(
        eq(verifiedOwnersTable.userId, userId),
        eq(verifiedOwnersTable.placeId, placeId),
      ),
    });

    if (!ownership) {
      return false;
    }

    // Check if subscription is active or trialing
    return (
      ownership.subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE ||
      ownership.subscriptionStatus === SUBSCRIPTION_STATUS.TRIALING
    );
  } catch (error) {
    console.error("❌ Error checking subscription status:", error);
    return false;
  }
}

/**
 * Get all places owned by a user
 * @param userId - The user ID
 * @returns Array of verified owner records
 */
export async function getUserOwnedPlaces(
  userId: UserId,
): Promise<VerifiedOwner[]> {
  try {
    const ownerships = await db.query.verifiedOwnersTable.findMany({
      where: eq(verifiedOwnersTable.userId, userId),
    });

    // Parse and validate each record
    return ownerships.map((ownership) =>
      verifiedOwnerSchema.parse({
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
    );
  } catch (error) {
    console.error("❌ Error fetching user owned places:", error);
    return [];
  }
}

/**
 * Check if a user has a pending claim for a place
 * @param userId - The user ID
 * @param placeId - The place ID
 * @returns true if pending claim exists, false otherwise
 */
export async function hasPendingClaim(
  userId: UserId,
  placeId: PlaceId,
): Promise<boolean> {
  try {
    const claim = await db.query.placeClaimsTable.findFirst({
      where: and(
        eq(placeClaimsTable.userId, userId),
        eq(placeClaimsTable.placeId, placeId),
        eq(placeClaimsTable.status, "pending"),
      ),
    });

    return !!claim;
  } catch (error) {
    console.error("❌ Error checking pending claim:", error);
    return false;
  }
}

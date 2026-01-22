"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserClaims } from "@/app/_actions/ownershipQueries";
import { getPlaceOwnershipStatus } from "@/app/_actions/ownershipQueries";

/**
 * Determine where to route user when they click ownership entry point
 */
export async function getOwnershipRoute(placeId?: string): Promise<{
  success: boolean;
  route: string;
  reason?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Not authenticated - send to login with redirect
      const redirectPath = placeId
        ? `/claim/start?placeId=${placeId}`
        : "/claim/start";
      return {
        success: true,
        route: `/login?redirect=${encodeURIComponent(redirectPath)}`,
      };
    }

    // Check user's claims
    const claimsResult = await getUserClaims(user.id);

    if (claimsResult.success && claimsResult.claims) {
      // Check for verified claims
      const verifiedClaims = claimsResult.claims.filter(
        (c) => c.status === "verified",
      );

      if (verifiedClaims.length > 0) {
        // User has verified ownership
        if (placeId) {
          // Check if they own this specific place
          const ownsThisPlace = verifiedClaims.some(
            (c) => c.placeId === placeId,
          );
          if (ownsThisPlace) {
            return {
              success: true,
              route: `/dashboard/places/${placeId}`,
              reason: "User owns this place",
            };
          }
        }

        // Send to their first verified place's dashboard
        return {
          success: true,
          route: `/dashboard/places/${verifiedClaims[0].placeId}`,
          reason: "User has verified ownership",
        };
      }

      // Check for pending claims
      const pendingClaims = claimsResult.claims.filter(
        (c) => c.status === "pending",
      );

      if (pendingClaims.length > 0) {
        // User has pending claim - send to status page
        if (placeId) {
          // Check if pending claim is for this place
          const pendingForThisPlace = pendingClaims.find(
            (c) => c.placeId === placeId,
          );
          if (pendingForThisPlace) {
            return {
              success: true,
              route: `/claim/${pendingForThisPlace.id}/status`,
              reason: "Pending claim for this place",
            };
          }
        }

        // Send to their first pending claim
        return {
          success: true,
          route: `/claim/${pendingClaims[0].id}/status`,
          reason: "User has pending claim",
        };
      }
    }

    // No claims - check if specific place is already claimed
    if (placeId) {
      const ownershipStatus = await getPlaceOwnershipStatus(placeId);
      if (ownershipStatus.success && ownershipStatus.hasVerifiedOwner) {
        // Place already has an owner
        return {
          success: true,
          route: `/claim/start?placeId=${placeId}&error=already_claimed`,
          reason: "Place already claimed by someone else",
        };
      }
    }

    // Send to start page
    const route = placeId ? `/claim/start?placeId=${placeId}` : "/claim/start";
    return {
      success: true,
      route,
      reason: "No existing claims",
    };
  } catch (error) {
    console.error("Error determining ownership route:", error);
    return {
      success: false,
      route: "/claim/start",
    };
  }
}

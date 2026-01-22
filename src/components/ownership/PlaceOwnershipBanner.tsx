import { createClient } from "@/utils/supabase/server";
import { SmartOwnershipLink } from "@/components/ownership/SmartOwnershipLink";
import { getPlaceOwnershipStatus } from "@/app/_actions/ownershipQueries";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type PlaceOwnershipBannerProps = {
  placeId: string;
  placeName: string;
  userHasActiveCheckin: boolean;
};

/**
 * Banner shown on place detail page with ownership CTA
 * Only shown to authenticated users with active check-in
 */
export async function PlaceOwnershipBanner({
  placeId,
  placeName,
  userHasActiveCheckin,
}: PlaceOwnershipBannerProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only show to authenticated users with active check-in
  if (!user || !userHasActiveCheckin) {
    return null;
  }

  // Check ownership status
  const ownershipStatus = await getPlaceOwnershipStatus(placeId);

  // Don't show if place already has verified owner (unless it's the current user)
  if (ownershipStatus.success && ownershipStatus.hasVerifiedOwner) {
    const isCurrentUser = ownershipStatus.verifiedOwner?.userId === user.id;

    if (isCurrentUser) {
      // User owns this place - show verified badge
      return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                You&apos;re the verified owner of {placeName}
              </p>
              <SmartOwnershipLink variant="place-detail" placeId={placeId} />
            </div>
          </div>
        </div>
      );
    }

    // Someone else owns it - don't show banner
    return null;
  }

  // Show ownership claim CTA
  return (
    <div className="bg-muted/50 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium">Own or manage this business?</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Claim ownership to access your business dashboard and manage your
              presence on OverHere.
            </p>
          </div>
          <SmartOwnershipLink variant="place-detail" placeId={placeId} />
        </div>
      </div>
    </div>
  );
}

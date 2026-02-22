// src/app/places/[placeId]/_components/PlacePageClientWrapper.tsx
"use client";

import { useSpecificChannelPrimer } from "@/hooks/realtime-hooks/useSpecificChannelPrimer";
import type { PlaceId, UserId } from "@/lib/types/core";
import type { PlaceVerificationDetails } from "@/lib/types/database"; // NEW
import { PlacePageClient } from "./PlacePageClient";

interface PlaceInfo {
  id: PlaceId;
  name: string;
  address: string;
}

interface WrapperProps {
  placeId: PlaceId;
  userId: UserId;
  placeInfo: PlaceInfo;
  verificationDetails: PlaceVerificationDetails | null; // NEW
}

export function PlacePageClientPrimerWrapper({
  placeId,
  userId,
  placeInfo,
  verificationDetails, // NEW
}: WrapperProps) {
  const isRealtimeReady = useSpecificChannelPrimer(placeId);

  if (!isRealtimeReady) {
    return (
      <main className="container mx-auto max-w-2xl p-4">
        <div className="p-8 text-center text-lg font-medium text-gray-500">
          Preparing Realtime Filters...
        </div>
      </main>
    );
  }

  return (
    <PlacePageClient
      placeId={placeId}
      userId={userId}
      placeInfo={placeInfo}
      verificationDetails={verificationDetails} // ← NEW: Pass through
      isPrimed={true}
    />
  );
}

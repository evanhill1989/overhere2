// src/app/places/[placeId]/_components/PlacePageClientWrapper.tsx
"use client";

import { useSpecificChannelPrimer } from "@/hooks/realtime-hooks/useSpecificChannelPrimer";
import type { PlaceId, UserId } from "@/lib/types/core";
import { PlacePageClient } from "./PlacePageClient"; // Assuming it's in the same directory

interface PlaceInfo {
  id: PlaceId;
  name: string;
  address: string;
}

interface WrapperProps {
  placeId: PlaceId;
  userId: UserId;
  placeInfo: PlaceInfo;
}

export function PlacePageClientPrimerWrapper({
  placeId,
  userId,
  placeInfo,
}: WrapperProps) {
  const isRealtimeReady = useSpecificChannelPrimer(placeId);

  if (!isRealtimeReady) {
    // 2. Block rendering the main client component until priming is confirmed
    return (
      <main className="container mx-auto max-w-2xl p-4">
        <div className="p-8 text-center text-lg font-medium text-gray-500">
          Preparing Realtime Filters...
        </div>
      </main>
    );
  }

  // 3. Once primed, render the main client component
  return (
    <PlacePageClient
      placeId={placeId}
      userId={userId}
      placeInfo={placeInfo}
      isPrimed={true}
    />
  );
}

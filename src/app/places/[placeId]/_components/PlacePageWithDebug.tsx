// src/app/places/[placeId]/_components/PlacePageWithDebug.tsx
"use client";

import { PlacePageClient } from "./PlacePageClient";
import { RealtimeStatusIndicator } from "@/components/debug/RealtimeStatusIndicator";
import type { UserId, PlaceId } from "@/lib/types/database";

type PlacePageWithDebugProps = {
  placeId: PlaceId;
  userId: UserId;
  placeInfo: {
    id: PlaceId;
    name: string;
    address: string;
  };
  enableDebug?: boolean;
};

export function PlacePageWithDebug({
  placeId,
  userId,
  placeInfo,
  enableDebug = process.env.NODE_ENV === "development",
}: PlacePageWithDebugProps) {
  return (
    <>
      <PlacePageClient
        placeId={placeId}
        userId={userId}
        placeInfo={placeInfo}
      />

      <RealtimeStatusIndicator
        userId={userId}
        placeId={placeId}
        enabled={enableDebug}
      />
    </>
  );
}

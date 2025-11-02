// src/app/places/[placeId]/_components/PlacePageWithDebug.tsx
"use client";

import { PlacePageClient } from "./PlacePageClient";
import { RealtimeStatusIndicator } from "./RealtimeStatusIndicator";
import type { UserId, PlaceId } from "@/lib/types/database";

type PlacePageWithDebugProps = {
  placeId: PlaceId;
  userId: UserId;
  placeInfo: {
    id: PlaceId;
    name: string;
    address: string;
  };
  isPrimed: boolean;
  enableDebug?: boolean;
};

export function PlacePageWithDebug({
  placeId,
  userId,
  placeInfo,
  isPrimed,
  enableDebug = process.env.NODE_ENV === "development",
}: PlacePageWithDebugProps) {
  return (
    <>
      <PlacePageClient
        placeId={placeId}
        userId={userId}
        placeInfo={placeInfo}
        isPrimed={isPrimed}
      />

      <RealtimeStatusIndicator
        userId={userId}
        placeId={placeId}
        enabled={enableDebug}
      />
    </>
  );
}

// src/hooks/usePlaceDataPrefetch.ts
// src/hooks/usePlaceDataPrefetch.ts
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { MessageSession, Checkin, PlaceId, UserId } from "@/lib/types/database";

type PlaceData = {
  checkins: Checkin[];
  session: MessageSession;
};

async function fetchPlaceData(
  placeId: PlaceId,
  userId: UserId,
): Promise<PlaceData> {
  const res = await fetch(
    `/api/prefetch/place-data?placeId=${placeId}&userId=${userId}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to prefetch place data: ${res.status}`);
  }
  return res.json();
}

export function usePlaceDataPrefetch() {
  const queryClient = useQueryClient();

  const prefetchPlaceData = useCallback(
    async (placeId: PlaceId, userId: UserId) => {
      await queryClient.prefetchQuery({
        queryKey: ["placeData", placeId, userId],
        queryFn: () => fetchPlaceData(placeId, userId),
        staleTime: 30000, // 30 seconds
      });
    },
    [queryClient],
  );

  return { prefetchPlaceData };
}

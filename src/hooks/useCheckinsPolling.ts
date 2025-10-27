// src/hooks/useCheckinsPolling.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { PlaceId } from "@/lib/types/core";
import type { Checkin } from "@/lib/types/database";

async function fetchCheckinsFromAPI(placeId: PlaceId): Promise<Checkin[]> {
  console.log("🔄 Polling checkins for place:", placeId);

  const response = await fetch(`/api/checkins?placeId=${placeId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("❌ Failed to fetch checkins:", response.status);
    throw new Error(`Failed to fetch checkins: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ Polling received ${data.length} checkins`);

  return data;
}

export function useCheckinsPolling(
  placeId: PlaceId | null,
  pollingInterval: number = 5000, // Default 5 seconds
) {
  return useQuery<Checkin[], Error>({
    queryKey: ["checkins-polling", placeId],
    queryFn: () => {
      if (!placeId) throw new Error("No placeId provided");
      return fetchCheckinsFromAPI(placeId);
    },
    enabled: !!placeId,
    refetchInterval: pollingInterval, // Poll every 5 seconds
    refetchIntervalInBackground: true, // Keep polling even when tab is not focused
    staleTime: 0, // Always consider data stale to ensure fresh updates
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

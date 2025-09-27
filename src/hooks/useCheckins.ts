// src/hooks/useCheckins.ts (NEW)
"use client";

import { useQuery } from "@tanstack/react-query";
import { SelectCheckin } from "@/lib/db/types";

async function fetchCheckins(placeId: string): Promise<SelectCheckin[]> {
  const res = await fetch(`/api/checkins?placeId=${placeId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch checkins: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}

export function useCheckins(placeId: string | null) {
  return useQuery({
    queryKey: ["checkins", placeId],
    queryFn: () => fetchCheckins(placeId!),
    enabled: !!placeId,
    refetchInterval: 15000, // Poll every 15 seconds
    staleTime: 10000, // Consider fresh for 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

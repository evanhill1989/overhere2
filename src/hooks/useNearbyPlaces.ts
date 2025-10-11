// src/hooks/useNearbyPlaces.ts
import { useQuery } from "@tanstack/react-query";

import { type Place } from "@/lib/types/database";
// ✅ NEW: Import the canonical Coords types
import { type Coords } from "@/lib/types/core";

// ✅ Update the input parameter to use the branded Coords type
export function useNearbyPlaces(coordinates: Coords | null) {
  return useQuery({
    queryKey: ["nearbyPlaces", coordinates],
    // ✅ Update the queryFn to promise the canonical Place[]
    queryFn: async (): Promise<Place[]> => {
      // Check for null/undefined is now implicitly handled by the Coords|null type
      if (!coordinates) throw new Error("No coordinates");

      const res = await fetch("/api/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The Coords object (branded numbers) can be safely destructured and stringified
        body: JSON.stringify({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      });

      if (!res.ok) {
        throw new Error(
          `Failed to fetch nearby places: ${res.status} ${res.statusText}`,
        );
      }
      // The API server MUST now be guaranteed to return the canonical Place shape (with .id)
      return res.json();
    },
    enabled: !!coordinates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors, only on network/server errors
      if (error.message.includes("4")) return false;
      return failureCount < 2;
    },
  });
}

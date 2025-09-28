// src/hooks/useNearbyPlaces.ts
import { useQuery } from "@tanstack/react-query";
import { Place } from "@/lib/types/places";

export function useNearbyPlaces(
  coordinates: { latitude: number; longitude: number } | null,
) {
  return useQuery({
    queryKey: ["nearbyPlaces", coordinates],
    queryFn: async (): Promise<Place[]> => {
      if (!coordinates) throw new Error("No coordinates");

      const res = await fetch("/api/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

import { useQuery } from "@tanstack/react-query";

// src/hooks/useNearbyPlaces.ts
export function useNearbyPlaces(
  coordinates: { latitude: number; longitude: number } | null,
) {
  return useQuery({
    queryKey: ["nearbyPlaces", coordinates],
    queryFn: async () => {
      if (!coordinates) throw new Error("No coordinates");

      const res = await fetch("/api/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coordinates),
      });

      if (!res.ok) throw new Error("Failed to fetch nearby places");
      return res.json();
    },
    enabled: !!coordinates,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// src/hooks/useSearchPlacesQuery.ts (RENAME FILE)
"use client";

import { useQuery } from "@tanstack/react-query"; // ✅ CHANGE: Use useQuery
import { searchPlaces } from "@/app/_actions/searchPlaces";
import { Place } from "@/lib/types/database";
import { Coords } from "@/lib/types/core";

type SearchPlacesInput = {
  query: string;
  coords: Coords | null;
};

// 1. Define the Query Key

export function useSearchPlacesQuery({
  query,
  coords,
  enabled,
}: SearchPlacesInput & { enabled: boolean }) {
  return useQuery({
    queryKey: [
      "placeSearch",
      query,
      coords?.latitude, // ✅ Safe access with optional chaining
      coords?.longitude,
    ],
    queryFn: async (): Promise<Place[]> => {
      // ✅ Guard clause - this should never run if coords is null due to enabled check
      if (!coords) {
        throw new Error("Coordinates are required for search");
      }

      console.log("🔍 Running search query via Server Action:", {
        query,
        coords,
      });

      return searchPlaces(query, coords);
    },
    // ✅ Only run if enabled AND coords exist AND query is not empty
    enabled: enabled && !!coords && query.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

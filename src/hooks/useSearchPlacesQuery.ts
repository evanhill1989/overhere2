// src/hooks/useSearchPlacesQuery.ts (RENAME FILE)
"use client";

import { useQuery } from "@tanstack/react-query"; // ✅ CHANGE: Use useQuery
import { searchPlaces } from "@/app/_actions/searchPlaces";

type SearchPlacesInput = {
  query: string;
  coords: { latitude: number; longitude: number };
};

// 1. Define the Query Key
const PLACE_SEARCH_QUERY_KEY = "placeSearch";

export function useSearchPlacesQuery({
  query,
  coords,
  enabled, // 👈 New prop to control fetching
}: SearchPlacesInput & { enabled: boolean }) {
  // 2. Define the Query Function
  const queryFn = async (): Promise<PlaceSearchResult[]> => {
    // This still calls the Server Action for security/rate-limiting,
    // but its results are now cached by React Query.
    console.log("🔍 Running search query via Server Action:", {
      query,
      coords,
    });
    return searchPlaces(query, coords);
  };

  // 3. Use useQuery
  return useQuery({
    // The query key is what enables caching and de-duplication
    queryKey: [
      PLACE_SEARCH_QUERY_KEY,
      query,
      coords.latitude,
      coords.longitude,
    ],
    queryFn,
    // Only run the query if 'enabled' is true (i.e., when in search mode)
    enabled: enabled && query.trim().length > 0,
    // Standard caching options
    staleTime: 5 * 60 * 1000, // 5 minutes of cache
    gcTime: 10 * 60 * 1000, // Garbage collect after 10 minutes
  });
}

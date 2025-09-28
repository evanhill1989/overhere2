// src/hooks/useSearchPlacesMutation.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { searchPlaces } from "@/app/_actions/searchPlaces";
import { Place } from "@/lib/types/places";

type SearchPlacesInput = {
  query: string;
  coords: { latitude: number; longitude: number };
};

export function useSearchPlacesMutation() {
  return useMutation({
    mutationFn: async ({
      query,
      coords,
    }: SearchPlacesInput): Promise<Place[]> => {
      console.log("🔍 Starting search mutation:", { query, coords });
      const results = await searchPlaces(query, coords);
      console.log("✅ Search completed:", results.length, "places found");
      return results;
    },

    // Optional: Add optimistic updates if you want instant UI feedback
    onMutate: async ({ query }) => {
      console.log("🚀 Search started for:", query);
      // Could add loading state or clear previous results here
      return { searchQuery: query };
    },

    onError: (error) => {
      console.error("❌ Search failed:", error.message);
      // Could show toast notification here
    },

    onSuccess: (data, variables) => {
      console.log(
        `✅ Search successful: Found ${data.length} places for "${variables.query}"`,
      );
    },

    onSettled: (data, error, variables) => {
      console.log("🏁 Search completed for:", variables.query);
    },
  });
}

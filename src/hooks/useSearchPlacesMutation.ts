// src/hooks/useSearchPlacesMutation.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { searchPlaces } from "@/app/_actions/searchPlaces";
import { Place } from "@/lib/types/database";

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
      const results = await searchPlaces(query, coords);
      return results;
    },

    // Optional: Add optimistic updates if you want instant UI feedback
    onMutate: async ({ query }) => {
      // Could add loading state or clear previous results here
      return { searchQuery: query };
    },

    onError: (error) => {
      // Could show toast notification here
    },

    onSuccess: (data, variables) => {
    },

    onSettled: (data, error, variables) => {
    },
  });
}

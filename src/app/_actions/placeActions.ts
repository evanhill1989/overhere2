// src/app/_actions/placeActions.ts
"use server";

import { db } from "@/index"; // Adjust path to your db instance
import { placesTable } from "@/db/schema"; // Adjust path
import { inArray } from "drizzle-orm";
import type { Place } from "@/types/places"; // Ensure this type includes isVerified?: boolean

const Maps_API_KEY = process.env.Maps_API_KEY;

interface GoogleTextSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  // Add other fields you might use from Google's response
  generative_summary?: string;
}

export interface SearchActionResult {
  places?: Place[];
  error?: string;
  query?: string;
}

export async function searchPlacesByQuery(
  previousState: SearchActionResult | null,
  formData: FormData,
): Promise<SearchActionResult> {
  if (!Maps_API_KEY) {
    return {
      error: "Configuration error.",
      query: (formData.get("searchQuery") as string) || undefined,
    };
  }
  const query = formData.get("searchQuery") as string;
  if (!query?.trim()) {
    return { error: "Search query cannot be empty.", query };
  }
  const trimmedQuery = query.trim();

  const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    trimmedQuery,
  )}&key=${Maps_API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok)
      throw new Error(
        `Google Places API request failed: ${response.statusText}`,
      );
    const data = await response.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Google Places API Error: ${data.status} - ${data.error_message || "Unknown error"}`,
      );
    }

    const placesFromGoogleApi: Omit<Place, "isVerified">[] = (
      data.results || []
    ).map(
      (place: GoogleTextSearchResult): Omit<Place, "isVerified"> => ({
        id: place.place_id,
        name: place.name,
        address: place.formatted_address || "Address not available",
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        generative_summary: place.generative_summary || "",
      }),
    );

    let enrichedPlaces: Place[] = [];

    if (placesFromGoogleApi.length > 0) {
      const placeIdsFromGoogle = placesFromGoogleApi.map((p) => p.id);
      const verificationStatuses = await db
        .select({
          id: placesTable.id,
          isVerified: placesTable.isVerified,
        })
        .from(placesTable)
        .where(inArray(placesTable.id, placeIdsFromGoogle));

      const verificationMap = new Map(
        verificationStatuses.map((vs) => [vs.id, vs.isVerified]),
      );

      enrichedPlaces = placesFromGoogleApi.map((p) => ({
        ...p,
        isVerified: verificationMap.get(p.id) ?? false,
      }));
    }

    return { places: enrichedPlaces, query: trimmedQuery };
  } catch (error: unknown) {
    let message = "Server error during place search.";
    if (error instanceof Error) {
      message = `Failed to search places. ${error.message.includes("API") ? "External API error." : ""}`;
    }
    return { error: message, query: trimmedQuery };
  }
}

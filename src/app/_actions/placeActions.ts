// src/app/_actions/placeActions.ts
"use server";

import { db } from "@/index";
import { placesTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import type { Place } from "@/types/places"; // Ensure Place type includes isVerified and optionally primaryType

const PLACES_API_KEY = process.env.PLACES_API_KEY;

interface GoogleApiNewTextSearchResult {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryTypeDisplayName?: { text: string; languageCode?: string };
  // Add other fields here if requested in FieldMask
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
  if (!PLACES_API_KEY) {
    return {
      error: "API Key configuration error",
      query: (formData.get("searchQuery") as string) || undefined,
    };
  }
  const query = formData.get("searchQuery") as string;
  if (!query?.trim()) {
    return { error: "Search query cannot be empty.", query };
  }
  const trimmedQuery = query.trim();

  const requestBody = {
    textQuery: trimmedQuery,
    maxResultCount: 10,
    // Optional: Add languageCode, regionCode, locationBias, etc. if needed
    // "locationBias": {
    //   "circle": {
    //     "center": { "latitude": userLat, "longitude": userLng }, // You'd need user's current location here
    //     "radius": 20000.0 // e.g., 20km bias
    //   }
    // }
  };

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryTypeDisplayName",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        `Google Places API (New) Text Search failed: ${response.status} ${errorData.error?.message || response.statusText}`,
      );
    }
    const data = await response.json();

    let placesFromGoogle: Place[] = (data.places || []).map(
      (place: GoogleApiNewTextSearchResult): Place => ({
        id: place.id,
        name: place.displayName?.text || "Unknown Name",
        address:
          place.formattedAddress ||
          place.types?.join(", ") ||
          "Address not available",
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        primaryType: place.primaryTypeDisplayName?.text,
        isVerified: false,
      }),
    );

    if (placesFromGoogle.length > 0) {
      const placeIdsFromGoogle = placesFromGoogle.map((p) => p.id);
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
      placesFromGoogle = placesFromGoogle.map((p) => ({
        ...p,
        isVerified: verificationMap.get(p.id) ?? false,
      }));
    }
    return { places: placesFromGoogle, query: trimmedQuery };
  } catch (error: unknown) {
    let message = "Server error during place search.";
    if (error instanceof Error) message = error.message;
    return { error: message, query: trimmedQuery };
  }
}

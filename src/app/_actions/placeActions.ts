// src/app/_actions/placeActions.ts
"use server";

import type { Place } from "@/types/places"; // Use your existing Place type

// Define the expected structure from Google Places Text Search API
interface GoogleTextSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string; // Text Search returns formatted_address
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  // Add other fields if needed, like 'types'
  types?: string[];
}

// Define the return type for our action
export interface SearchActionResult {
  places?: Place[];
  error?: string;
  query?: string; // Optionally return the query that was run
}

const Maps_API_KEY = process.env.Maps_API_KEY;

export async function searchPlacesByQuery(
  previousState: SearchActionResult | null, // For useActionState - keep shape consistent
  formData: FormData
): Promise<SearchActionResult> {
  if (!Maps_API_KEY) {
    console.error("Maps_API_KEY environment variable not set.");
    return { error: "Configuration error." };
  }

  const query = formData.get("searchQuery") as string;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return { error: "Search query cannot be empty." };
  }

  const trimmedQuery = query.trim();
  console.log(
    `Server Action: Searching for places with query: "${trimmedQuery}"`
  );

  // Using Google Places API - Text Search
  // Ref: https://developers.google.com/maps/documentation/places/web-service/text-search
  // Consider adding location bias later if needed: &location=lat,lng&radius=meters
  const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    trimmedQuery
  )}&key=${Maps_API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(
        "Google Places Text Search API request failed:",
        response.status,
        response.statusText
      );
      const errorBody = await response.text();
      console.error("Error Body:", errorBody);
      throw new Error(
        `Google Places API request failed: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(
        "Google Places API Error:",
        data.status,
        data.error_message
      );
      console.error("Full Error Response:", JSON.stringify(data, null, 2));
      throw new Error(
        `Google Places API Error: ${data.status} - ${
          data.error_message || "Unknown error"
        }`
      );
    }

    console.log(
      "Raw Google Text Search Results:",
      JSON.stringify(data.results, null, 2)
    );

    const places: Place[] = (data.results || []).map(
      (place: GoogleTextSearchResult): Place => ({
        id: place.place_id,
        name: place.name,
        // Use formatted_address from Text Search, fallback if needed
        address: place.formatted_address || "Address not available",
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
      })
    );

    console.log(
      "Processed Places from Server Action:",
      JSON.stringify(places, null, 2)
    );

    return { places: places, query: trimmedQuery }; // Success case
  } catch (error: unknown) {
    console.error("Error in searchPlacesByQuery Server Action:", error);
    let message = "Server error during place search.";
    if (error instanceof Error) {
      // Avoid leaking potentially sensitive details from external API errors
      message = `Failed to search places. ${
        error.message.includes("API") ? "External API error." : ""
      }`;
    }
    return { error: message, query: trimmedQuery };
  }
}

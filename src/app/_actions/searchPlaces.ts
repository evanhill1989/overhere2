// src/app/_actions/searchPlaces.ts
"use server";

import {
  checkServerActionRateLimit,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/serverActionRateLimit";
import { z } from "zod";

// ✅ Import canonical types and schemas
import {
  type PlaceId,
  placeIdSchema,
  placeNameSchema,
  placeAddressSchema,
} from "@/lib/types/core";

// ============================================
// SEARCH INPUT VALIDATION
// ============================================

const searchQuerySchema = z
  .string()
  .min(1, "Search query cannot be empty")
  .max(100, "Search query too long (max 100 characters)")
  .transform((str) => str.trim())
  .refine((str) => str.length > 0, "Search query cannot be only whitespace");

const searchCoordinatesSchema = z.object({
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

const searchPlacesInputSchema = z.object({
  query: searchQuerySchema,
  coords: searchCoordinatesSchema,
  maxResults: z.number().int().min(1).max(50).optional().default(10),
  radiusMeters: z.number().int().min(100).max(50000).optional().default(20000),
});

type SearchPlacesInput = z.infer<typeof searchPlacesInputSchema>;

// ✅ Simple schema for primary type (no branding for API results)
const simplePrimaryTypeSchema = z
  .string()
  .max(255, "Primary type too long")
  .transform((str) => str.trim());

// ============================================
// API RESPONSE TYPES
// ============================================

// Raw response from Google Places API
type RawGooglePlaceResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text?: string };
};

// ✅ Search result type (matches what frontend expects)
// This is distinct from the database Place entity
// Uses PlaceId for the ID but plain strings for other fields
export type PlaceSearchResult = {
  place_id: PlaceId;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  primaryType?: string; // ✅ Plain string, not branded
  isVerified: boolean;
};

// ============================================
// MAIN SEARCH FUNCTION
// ============================================

export async function searchPlaces(
  query: string,
  coords: { latitude: number; longitude: number },
  options?: {
    maxResults?: number;
    radiusMeters?: number;
  },
): Promise<PlaceSearchResult[]> {
  // ✅ Step 1: Validate all inputs
  let validated: SearchPlacesInput;
  try {
    validated = searchPlacesInputSchema.parse({
      query,
      coords,
      maxResults: options?.maxResults,
      radiusMeters: options?.radiusMeters,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Search input validation failed:", error.errors);
      throw new Error(
        `Invalid search input: ${error.errors[0]?.message || "Validation failed"}`,
      );
    }
    throw error;
  }

  console.log("✅ Search input validated:", {
    query: validated.query,
    coords: validated.coords,
    maxResults: validated.maxResults,
  });

  // ✅ Step 2: Rate limiting check
  const rateLimitResult = await checkServerActionRateLimit(
    RATE_LIMIT_CONFIGS.searchPlaces,
  );

  if (!rateLimitResult.success) {
    console.error("❌ Rate limit exceeded for place search");
    throw new Error(
      rateLimitResult.error ||
        "Too many searches. Please wait before searching again.",
    );
  }

  console.log(
    `✅ Search rate limit check passed. Remaining: ${rateLimitResult.remaining}`,
  );

  // ✅ Step 3: Verify API key
  const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!PLACES_API_KEY) {
    console.error("❌ Missing GOOGLE_PLACES_API_KEY environment variable");
    throw new Error("Server configuration error: Missing API key");
  }

  // ✅ Step 4: Build API request
  const requestBody = {
    textQuery: validated.query,
    maxResultCount: validated.maxResults,
    locationBias: {
      circle: {
        center: {
          latitude: validated.coords.latitude,
          longitude: validated.coords.longitude,
        },
        radius: validated.radiusMeters,
      },
    },
  };

  // ✅ Step 5: Make API request with proper error handling
  let response: Response;
  try {
    response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName",
        },
        body: JSON.stringify(requestBody),
      },
    );
  } catch (error) {
    console.error("❌ Google Places API request failed:", error);
    throw new Error(
      "Failed to connect to Google Places API. Please check your connection.",
    );
  }

  // ✅ Step 6: Handle API errors
  if (!response.ok) {
    let errorMessage = `Google Places API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // If error response isn't JSON, use status text
      errorMessage = `${errorMessage} - ${response.statusText}`;
    }

    console.error("❌ Google Places API error:", errorMessage);
    throw new Error(errorMessage);
  }

  // ✅ Step 7: Parse and validate API response
  let data: { places?: RawGooglePlaceResult[] };
  try {
    data = await response.json();
  } catch (error) {
    console.error("❌ Failed to parse Google Places API response:", error);
    throw new Error("Invalid response from Google Places API");
  }

  if (!data.places || !Array.isArray(data.places)) {
    console.warn("⚠️ Google Places API returned no results");
    return [];
  }

  // ✅ Step 8: Transform and validate results
  const results: PlaceSearchResult[] = [];

  for (const place of data.places) {
    try {
      // Validate critical fields
      if (!place.id || !place.displayName?.text) {
        console.warn("⚠️ Skipping place with missing required fields:", place);
        continue;
      }

      // Parse with branded types where appropriate
      const placeId = placeIdSchema.parse(place.id);
      const name = placeNameSchema.parse(
        place.displayName.text || "Unknown Place",
      );
      const address = placeAddressSchema.parse(
        place.formattedAddress || "Address not available",
      );

      // ✅ Parse primaryType as plain string (no branding for API results)
      const primaryType = place.primaryTypeDisplayName?.text
        ? simplePrimaryTypeSchema.parse(place.primaryTypeDisplayName.text)
        : undefined;

      const result: PlaceSearchResult = {
        place_id: placeId,
        name,
        address,
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        primaryType, // ✅ Now a plain string
        isVerified: false, // Search results are not verified by default
      };

      results.push(result);
    } catch (error) {
      // Log validation errors but continue processing other results
      console.warn("⚠️ Failed to validate place result:", place, error);
      continue;
    }
  }

  console.log(`✅ Search completed: ${results.length} valid results`);
  return results;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate search input separately if needed by components
 */
export async function validateSearchInput(input: {
  query: string;
  coords: { latitude: number; longitude: number };
}): Promise<{ valid: boolean; error?: string | undefined }> {
  try {
    searchPlacesInputSchema.parse(input);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.errors[0]?.message || "Invalid input",
      };
    }
    return { valid: false, error: "Validation failed" };
  }
}

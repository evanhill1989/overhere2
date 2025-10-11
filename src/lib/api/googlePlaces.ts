// src/lib/api/googlePlaces.ts - Updated to match canonical Place type
import { Place } from "@/lib/types/database";
import {
  placeIdSchema,
  placeNameSchema,
  placeAddressSchema,
  timestampSchema,
} from "@/lib/types/core";

type RawGooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text?: string };
};

export async function getNearbyPlaces(coords: {
  latitude: number;
  longitude: number;
}): Promise<Place[]> {
  const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!PLACES_API_KEY) {
    console.error("❌ Missing GOOGLE_PLACES_API_KEY environment variable");
    throw new Error("Missing Google Places API key");
  }

  const requestBody = {
    includedTypes: ["cafe"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        radius: 500,
      },
    },
    rankPreference: "POPULARITY",
  };

  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
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

  if (!res.ok) {
    console.error("Nearby Places API failed:", await res.text());
    throw new Error(`Google API error: ${res.status}`);
  }

  const data = await res.json();

  // ✅ Transform to canonical Place structure with proper validation
  const mappedPlaces: Place[] = (data.places || []).map((p: RawGooglePlace) => {
    try {
      const place: Place = {
        // ✅ Use 'id' not 'place_id' for canonical structure
        id: placeIdSchema.parse(p.id),
        name: placeNameSchema.parse(p.displayName?.text || "Unknown"),
        address: placeAddressSchema.parse(p.formattedAddress || "No address"),
        latitude: p.location?.latitude ?? null,
        longitude: p.location?.longitude ?? null,
        lastFetchedAt: timestampSchema.parse(new Date()),
        isVerified: false,
        primaryType: p.primaryTypeDisplayName?.text ?? null,
      };

      // ✅ DEBUG: Log each place being created
      console.log("✅ Created place:", {
        id: place.id,
        name: place.name,
        idType: typeof place.id,
      });

      return place;
    } catch (error) {
      console.error("❌ Failed to transform place:", p, error);
      throw error;
    }
  });

  console.log(`✅ Mapped ${mappedPlaces.length} places successfully`);
  return mappedPlaces;
}

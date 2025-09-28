// lib/api/googlePlaces.ts
import { Place } from "@/lib/types/places";

type RawGooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text?: string };
};

// ---------- Search by Text (client-side or manual search) ----------

// lib/api/googlePlaces.ts

export async function getNearbyPlaces(coords: {
  latitude: number;
  longitude: number;
}): Promise<Place[]> {
  const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!PLACES_API_KEY) {
    console.error("❌ Missing GOOGLE_PLACES_API_KEY environment variable");
    throw new Error("Missing Google Places API key");
  }

  console.log("✅ API key found, length:", PLACES_API_KEY.length);
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

  console.time("⏱️ Google Places API HTTP request");
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
  console.timeEnd("⏱️ Google Places API HTTP request");

  if (!res.ok) {
    console.error("Nearby Places API failed:", await res.text());
    throw new Error(`Google API error: ${res.status}`);
  }

  console.time("⏱️ Parse Google API response");
  const data = await res.json();
  console.timeEnd("⏱️ Parse Google API response");

  console.time("⏱️ Map places data");
  const mappedPlaces = (data.places || []).map(
    (p: RawGooglePlace): Place => ({
      place_id: p.id,
      name: p.displayName?.text || "Unknown",
      address: p.formattedAddress || "No address",
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      primaryType: p.primaryTypeDisplayName?.text,
      isVerified: false,
    }),
  );
  console.timeEnd("⏱️ Map places data");

  return mappedPlaces;
}
// ---------- Shared Mapping ----------

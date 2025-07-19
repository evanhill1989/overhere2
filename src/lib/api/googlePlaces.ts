// lib/api/googlePlaces.ts
import { Place } from "@/lib/types/places";

export async function searchGooglePlaces(
  query: string,
  coords: GeolocationCoordinates,
): Promise<Place[]> {
  const PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!PLACES_API_KEY) throw new Error("Missing API key");

  const requestBody = {
    textQuery: query,
    maxResultCount: 10,
    locationBias: {
      circle: {
        center: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        radius: 20000,
      },
    },
  };

  const res = await fetch(
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

  if (!res.ok) throw new Error(`Google API error: ${res.status}`);

  const data = await res.json();
  return (data.places || []).map(
    (p: any): Place => ({
      place_id: p.id,
      name: p.displayName?.text || "Unknown",
      address: p.formattedAddress || "No address",
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      primaryType: p.primaryTypeDisplayName?.text,
      isVerified: false,
    }),
  );
}

// lib/api/googlePlaces.ts
import { Place } from "@/lib/types/places";

type RawGooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text?: string };
};

type RawNearbyPlace = {
  place_id: string;
  name?: string;
  vicinity?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  business_status?: string;
};

// ---------- Search by Text (client-side or manual search) ----------
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
  return (data.places || []).map(mapGooglePlace);
}

// ---------- Nearby Search (for initial server-side loading) ----------
export async function getNearbyPlaces({
  latitude,
  longitude,
  radius = 1500,
}: {
  latitude: number;
  longitude: number;
  radius?: number;
}): Promise<Place[]> {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!API_KEY) throw new Error("Missing API key");

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
  );
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("location", `${latitude},${longitude}`);
  url.searchParams.set("radius", radius.toString());
  url.searchParams.set("type", "establishment");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Nearby Places API error: ${res.status}`);

  const data = await res.json();
  return (data.results || []).map(mapNearbySearchPlace);
}

// ---------- Shared Mapping ----------
function mapGooglePlace(p: RawGooglePlace): Place {
  return {
    place_id: p.id,
    name: p.displayName?.text || "Unknown",
    address: p.formattedAddress || "No address",
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    primaryType: p.primaryTypeDisplayName?.text,
    isVerified: false,
  };
}

function mapNearbySearchPlace(p: RawNearbyPlace): Place {
  return {
    place_id: p.place_id,
    name: p.name || "Unknown",
    address: p.vicinity || "No address",
    lat: p.geometry?.location?.lat,
    lng: p.geometry?.location?.lng,
    primaryType: p.types?.[0],
    isVerified: false,
  };
}

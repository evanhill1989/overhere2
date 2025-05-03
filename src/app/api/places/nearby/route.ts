// src/app/api/places/nearby/route.ts
import { NextResponse } from "next/server";
import type { Place } from "@/types/places";

const SERVICE_PROVIDER = "google"; // or 'mapbox', 'other'
const Maps_API_KEY = process.env.Maps_API_KEY;

interface GooglePlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  types?: string[]; // Keep types, might be useful for debugging/future filtering
}

export async function POST(request: Request) {
  if (!Maps_API_KEY) {
    console.error("Mapping API Key/Token is missing");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  try {
    const { latitude, longitude } = await request.json();

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Invalid latitude or longitude" },
        { status: 400 }
      );
    }

    let apiUrl = "";
    let places: Place[] = [];

    if (SERVICE_PROVIDER === "google") {
      // --- MODIFICATION START ---
      // Rank by DISTANCE and filter by TYPE = 'cafe'
      const searchType = "cafe"; // Set the specific type we want
      // rankby=distance requires *not* using radius. It searches outwards.
      apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude}%2C${longitude}&rankby=distance&type=${searchType}&key=${Maps_API_KEY}`;
      // --- MODIFICATION END ---

      console.log("Fetching Google Places with URL:", apiUrl); // Log the URL

      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(
          "Google Places API request failed:",
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

      // Log the raw results for inspection
      console.log(
        `Raw Google Places Results (type=${searchType}):`,
        JSON.stringify(data.results, null, 2)
      );

      places = (data.results || []).map(
        (place: GooglePlaceResult): Place => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity || "Address not available",
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng,
          // Optional: keep types if needed later
          // types: place.types
        })
      );
    } else {
      return NextResponse.json(
        { error: "Invalid service provider configured" },
        { status: 500 }
      );
    }

    // Log the final processed places
    console.log("Processed Places:", JSON.stringify(places, null, 2));

    // Check if places array is empty and potentially provide feedback
    if (places.length === 0) {
      console.log(
        `No places found for type 'cafe' near ${latitude}, ${longitude}`
      );
      // Depending on desired behavior, you might want to return an empty list
      // or perhaps try another type if 'cafe' yields nothing. For now, just return empty.
    }

    return NextResponse.json({ places });
  } catch (error: unknown) {
    console.error("Error fetching nearby places:", error);

    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return NextResponse.json(
      {
        error: "Failed to fetch nearby places",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

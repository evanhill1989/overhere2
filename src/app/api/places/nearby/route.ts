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
      const searchType = "point_of_interest"; // Or 'establishment', 'restaurant', etc.
      apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude}%2C${longitude}&rankby=distance&type=${searchType}&key=${Maps_API_KEY}`;

      // Option 2: Keep radius but filter by type (If fixed radius is essential)
      // const radius = 500; // Keep radius if you uncomment this
      // const searchType = "point_of_interest";
      // apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude}%2C${longitude}&radius=${radius}&type=${searchType}&key=${Maps_API_KEY}`;

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
        throw new Error(
          `Google Places API Error: ${data.status} - ${
            data.error_message || "Unknown error"
          }`
        );
      }

      places = (data.results || []).map(
        (place: GooglePlaceResult): Place => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity || "Address not available",
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng,
        })
      );
    } else {
      return NextResponse.json(
        { error: "Invalid service provider configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({ places });
  } catch (error: unknown) {
    // <-- Use unknown instead of any
    console.error("Error fetching nearby places:", error);

    // Safely extract the error message
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    // You could add more checks here for other error types if needed

    return NextResponse.json(
      {
        error: "Failed to fetch nearby places",
        details: errorMessage, // Use the extracted message
      },
      { status: 500 }
    );
  }
}

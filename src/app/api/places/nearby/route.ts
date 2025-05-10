// src/app/api/places/nearby/route.ts
import { NextResponse } from "next/server";
import { db } from "@/index";
import { placesTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import type { Place } from "@/types/places";

const Maps_API_KEY = process.env.Maps_API_KEY;

interface GoogleNearbySearchResult {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
}

export async function POST(request: Request) {
  if (!Maps_API_KEY) {
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { latitude, longitude } = body;

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "Latitude and longitude are required." },
        { status: 400 },
      );
    }

    const searchType =
      "cafe|bar|restaurant|library|park|book_store|art_gallery|museum";
    const apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude}%2C${longitude}&rankby=distance&type=${searchType}&key=${Maps_API_KEY}`;

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
      (place: GoogleNearbySearchResult): Omit<Place, "isVerified"> => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity || "Address not available",
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
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

    return NextResponse.json({ places: enrichedPlaces });
  } catch (error: unknown) {
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === "string") errorMessage = error;
    return NextResponse.json(
      { error: "Failed to fetch nearby places", details: errorMessage },
      { status: 500 },
    );
  }
}

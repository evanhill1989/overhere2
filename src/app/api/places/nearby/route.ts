// src/app/api/places/nearby/route.ts
import { NextResponse } from "next/server";
import { db } from "@/index";
import { placesTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import type { Place } from "@/types/places";

const PLACES_API_KEY = process.env.PLACES_API_KEY;

interface GoogleApiNewPlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryTypeDisplayName?: { text: string; languageCode?: string };
  // Add other fields here if requested in FieldMask
}

export async function POST(request: Request) {
  if (!PLACES_API_KEY) {
    return NextResponse.json(
      { error: "API Key configuration error" },
      { status: 500 },
    );
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

    const requestBody = {
      includedTypes: ["cafe"],
      excludedPrimaryTypes: ["restaurant"],
      maxResultCount: 15,
      locationRestriction: {
        circle: {
          center: { latitude: latitude, longitude: longitude },
          radius: 10000.0, // Example: 2km radius
        },
      },
      rankPreference: "POPULARITY", // Only if includedTypes has ONE entry or is empty
    };

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
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
        `Google Places API (New) request failed: ${response.status} ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();

    let placesFromGoogle: Place[] = (data.places || []).map(
      (place: GoogleApiNewPlace): Place => ({
        id: place.id,
        name: place.displayName?.text || "Unknown Name",
        address:
          place.formattedAddress ||
          place.types?.join(", ") ||
          "Address not available",
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        primaryType: place.primaryTypeDisplayName?.text, // Store primary type if needed
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

    return NextResponse.json({ places: placesFromGoogle });
  } catch (error: unknown) {
    let errorMessage = "Unknown error fetching nearby places";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json(
      { error: "Failed to fetch nearby places", details: errorMessage },
      { status: 500 },
    );
  }
}

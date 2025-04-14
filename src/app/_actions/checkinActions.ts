// src/app/_actions/checkinActions.ts
"use server";

import { db } from "@/index";
import {
  checkinsTable,
  placesTable,
  type SelectPlace,
  usersTable,
} from "@/db/schema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";

export type ActionResult = {
  success: boolean;
  message: string;
  checkinId?: number;
};

const CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function fetchAndCacheGooglePlaceDetails(
  placeId: string
): Promise<SelectPlace | null> {
  // 1. Check Cache (Local DB)
  try {
    const cachedPlace = await db.query.placesTable?.findFirst({
      where: eq(placesTable.id, placeId),
    });

    if (cachedPlace) {
      const isStale =
        new Date().getTime() - cachedPlace.lastFetchedAt.getTime() >
        CACHE_STALE_MS;
      if (!isStale) {
        console.log(`Cache hit for place ID: ${placeId}`);
        return cachedPlace;
      }
      console.log(`Cache stale for place ID: ${placeId}`);
    } else {
      console.log(`Cache miss for place ID: ${placeId}`);
    }
  } catch (dbError) {
    console.error(`DB cache lookup failed for place ID ${placeId}:`, dbError);
  }

  // 2. Fetch from Google API if Cache Miss or Stale
  const apiKey = process.env.Maps_API_KEY; // Ensure this matches your .env variable name
  if (!apiKey) {
    console.error("Maps_API_KEY environment variable not set.");
    return null;
  }

  const fields = "name,formatted_address,geometry/location";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=${fields}`;
  let googlePlaceData;

  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Google API responded with status: ${response.status}`);
    const data = await response.json();
    if (data.status !== "OK")
      throw new Error(
        `Google API status: ${data.status}. ${data.error_message || ""}`
      );
    googlePlaceData = data.result;
    if (!googlePlaceData?.name || !googlePlaceData?.formatted_address) {
      throw new Error("Google API response missing essential details.");
    }
  } catch (fetchError) {
    console.error(
      `Failed to fetch details from Google API for place ID ${placeId}:`,
      fetchError
    );
    return null;
  }

  // 3. Store/Update Cache (Local DB)
  const placeToCache = {
    id: placeId,
    name: googlePlaceData.name,
    address: googlePlaceData.formatted_address,
    latitude: googlePlaceData.geometry?.location?.lat ?? null,
    longitude: googlePlaceData.geometry?.location?.lng ?? null,
    lastFetchedAt: new Date(),
  };

  try {
    const updatedOrInserted = await db
      .insert(placesTable)
      .values(placeToCache)
      .onConflictDoUpdate({
        target: placesTable.id,
        set: {
          name: sql.raw(`excluded.${placesTable.name.name}`),
          address: sql.raw(`excluded.${placesTable.address.name}`),
          latitude: sql.raw(`excluded.${placesTable.latitude.name}`),
          longitude: sql.raw(`excluded.${placesTable.longitude.name}`),
          lastFetchedAt: sql.raw(`excluded.${placesTable.lastFetchedAt.name}`),
        },
      })
      .returning();

    if (updatedOrInserted?.[0]) {
      console.log(`Cache updated/inserted for place ID: ${placeId}`);
      return updatedOrInserted[0];
    } else {
      throw new Error("Failed to insert or update cache in DB.");
    }
  } catch (dbError) {
    console.error(
      `DB cache update/insert failed for place ID ${placeId}:`,
      dbError
    );
    // Return fetched data even if caching fails for this attempt
    return {
      id: placeId,
      name: placeToCache.name,
      address: placeToCache.address,
      latitude: placeToCache.latitude,
      longitude: placeToCache.longitude,
      lastFetchedAt: placeToCache.lastFetchedAt,
    };
  }
}

export async function submitCheckIn(
  previousState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();
  const user = await getUser();

  if (!authenticated || !user?.id) {
    return {
      success: false,
      message: "User not authenticated or details missing.",
    };
  }
  const userKindeId = user.id;

  const selectedPlaceId = formData.get("selectedPlaceId") as string | null;
  // --- Get Topic from Form Data ---
  const topicPreference = formData.get("topicPreference") as string | null; // Name this field in your form

  if (!selectedPlaceId) {
    return { success: false, message: "No place selected." };
  }

  const placeDetails = await fetchAndCacheGooglePlaceDetails(selectedPlaceId);
  if (!placeDetails) {
    return { success: false, message: "Could not retrieve place details." };
  }

  let checkinId: number | undefined;
  try {
    const newCheckin = await db
      .insert(checkinsTable)
      .values({
        userId: userKindeId,
        placeId: placeDetails.id,
        placeName: placeDetails.name,
        placeAddress: placeDetails.address,
        latitude: placeDetails.latitude,
        longitude: placeDetails.longitude,
        status: "available", // Default to available on new check-in
        topic: topicPreference?.trim() || null, // Save topic or null if empty/missing
      })
      .returning({ id: checkinsTable.id });

    if (!newCheckin?.[0]?.id) {
      throw new Error("Database insertion failed.");
    }
    checkinId = newCheckin[0].id;
  } catch (error: any) {
    console.error(`Check-in DB operation failed:`, error);
    return {
      success: false,
      message: `Check-in failed: ${error.message || "Database error."}`,
    };
  }

  console.log(
    `User ${userKindeId} checked into ${placeDetails.name} (ID: ${checkinId})`
  );
  redirect(`/places/${placeDetails.id}`);
}

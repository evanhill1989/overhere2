// src/app/_actions/checkinActions.ts
"use server";

import { db } from "@/index";
import { checkinsTable, placesTable, type SelectPlace } from "@/db/schema";
import type { InsertCheckin, SelectCheckin } from "@/db/schema"; // Import types
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { calculateDistance } from "@/lib/utils";

export type ActionResult = {
  success: boolean;
  message: string;
  checkinId?: number;
};

const CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CHECKIN_UPDATE_WINDOW_MS = 2 * 60 * 60 * 1000;

// --- DEFINE PROXIMITY THRESHOLD ---
const MAX_CHECKIN_DISTANCE_METERS = 200; // Allow check-in within 200 meters (adjust as needed)
// ---

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
  previousState: ActionResult | null, // For useActionState
  formData: FormData
): Promise<ActionResult> {
  // 1. Authentication
  const { getUser, isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();
  const user = await getUser();

  if (!authenticated || !user?.id) {
    return { success: false, message: "User not authenticated." };
  }
  const userKindeId = user.id;

  // 2. Get Data from Form
  const selectedPlaceId = formData.get("selectedPlaceId") as string | null;
  const topicPreference = formData.get("topicPreference") as string | null;
  const statusPreference = formData.get("status") as
    | SelectCheckin["status"]
    | null;
  const userLatitudeStr = formData.get("userLatitude") as string | null;
  const userLongitudeStr = formData.get("userLongitude") as string | null;

  if (!selectedPlaceId) {
    return { success: false, message: "No place selected." };
  }

  if (!statusPreference || !["available", "busy"].includes(statusPreference)) {
    return { success: false, message: "Invalid status selected." };
  }

  // Validate received user location ---
  if (!userLatitudeStr || !userLongitudeStr) {
    return {
      success: false,
      message: "Your location could not be determined for check-in.",
    };
  }
  const userLatitude = parseFloat(userLatitudeStr);
  const userLongitude = parseFloat(userLongitudeStr);
  if (isNaN(userLatitude) || isNaN(userLongitude)) {
    return { success: false, message: "Invalid location data received." };
  }

  // 3. Get Place Details
  const placeDetails = await fetchAndCacheGooglePlaceDetails(selectedPlaceId);
  if (!placeDetails) {
    return { success: false, message: "Could not retrieve place details." };
  }
  if (placeDetails.latitude == null || placeDetails.longitude == null) {
    return {
      success: false,
      message: "Cannot verify proximity: Place location is unknown.",
    };
  }

  const distance = calculateDistance(
    userLatitude,
    userLongitude,
    placeDetails.latitude,
    placeDetails.longitude
  );

  console.log(
    `Distance Check: User to ${placeDetails.name} = ${distance.toFixed(
      1
    )} meters.`
  );

  if (distance > MAX_CHECKIN_DISTANCE_METERS) {
    return {
      success: false,
      message: `You seem too far away to check in here. Please get closer.`,
    };
  }

  let checkinId: number | undefined;
  let operationType: "insert" | "update" | null = null;

  try {
    // --- 4. Check for Existing Recent Check-in ---
    const thresholdTime = new Date(Date.now() - CHECKIN_UPDATE_WINDOW_MS);
    const existingCheckin = await db.query.checkinsTable.findFirst({
      where: and(
        eq(checkinsTable.userId, userKindeId),
        eq(checkinsTable.placeId, placeDetails.id),
        gt(checkinsTable.createdAt, thresholdTime)
        // Optional: only update if it was recent? Or update regardless?
        // Let's update even older ones to "refresh" them if found for this user/place
        // gt(checkinsTable.createdAt, thresholdTime)
      ),

      columns: { id: true }, // We only need the ID
    });

    // --- 5. Perform Update or Insert ---
    if (existingCheckin) {
      // --- 5a. UPDATE Existing Check-in ---
      operationType = "update";
      console.log(
        `ACTION: Attempting to UPDATE checkin ID ${existingCheckin.id} for user ${userKindeId}`
      );
      const updateResult = await db
        .update(checkinsTable)
        .set({
          createdAt: new Date(),
          status: statusPreference,
          topic: topicPreference?.trim() || null,
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          placeName: placeDetails.name,
          placeAddress: placeDetails.address,
        })
        .where(eq(checkinsTable.id, existingCheckin.id))
        .returning({ id: checkinsTable.id });

      if (!updateResult?.[0]?.id) {
        throw new Error("Database update failed for existing check-in.");
      }
      checkinId = updateResult[0].id;
    } else {
      // --- 5b. INSERT New Check-in ---
      operationType = "insert";
      console.log(
        `ACTION: Attempting to INSERT new checkin for user ${userKindeId} at place ${placeDetails.id}`
      );
      const newCheckinData: InsertCheckin = {
        userId: userKindeId,
        placeId: placeDetails.id,
        placeName: placeDetails.name,
        placeAddress: placeDetails.address,
        latitude: placeDetails.latitude,
        longitude: placeDetails.longitude,
        status: statusPreference, // Use status from form
        topic: topicPreference?.trim() || null,
      };
      const insertResult = await db
        .insert(checkinsTable)
        .values(newCheckinData)
        .returning({ id: checkinsTable.id });
      console.log(`ACTION: Insert Result:`, insertResult); // Log after
      if (!insertResult?.[0]?.id) {
        throw new Error("Database insertion failed for new check-in.");
      }
      checkinId = insertResult[0].id;
    }
  } catch (error: unknown) {
    console.error(
      `Check-in DB operation (${operationType || "find"}) failed:`,
      error
    );
    let message = "Database error during check-in.";
    if (error instanceof Error && error.message) {
      // Avoid leaking detailed DB errors, but maybe log them
      message = "A database error occurred.";
    }
    return { success: false, message: message };
  }

  console.log(
    `User ${userKindeId} ${
      operationType === "update" ? "updated check-in" : "checked into"
    } ${placeDetails.name} (Checkin ID: ${checkinId})`
  );

  redirect(`/places/${placeDetails.id}`);

  return { success: true, message: "Checked in successfully!", checkinId };
}

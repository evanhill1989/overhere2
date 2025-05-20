// src/app/_actions/checkinActions.ts
"use server";

import { db } from "@/index";
import {
  checkinsTable,
  placesTable,
  type SelectPlace,
  type InsertCheckin,
  // usersTable, // Assuming usersTable import is still needed if used by other functions
} from "@/db/schema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { and, eq, sql, desc } from "drizzle-orm"; // Added desc, inArray
import { calculateDistance } from "@/lib/utils"; // Assuming this exists

export type ActionResult = {
  success: boolean;
  message: string;
  checkinId?: number;
};

const CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000;
const CHECKIN_UPDATE_WINDOW_MS = 2 * 60 * 60 * 1000;
const MAX_CHECKIN_DISTANCE_METERS = 2000;

async function fetchAndCacheGooglePlaceDetails(
  placeId: string,
): Promise<SelectPlace | null> {
  try {
    const cachedPlace = await db.query.placesTable?.findFirst({
      where: eq(placesTable.id, placeId),
    });

    if (cachedPlace) {
      const isStale =
        new Date().getTime() - cachedPlace.lastFetchedAt.getTime() >
        CACHE_STALE_MS;
      if (!isStale) {
        return cachedPlace;
      }
    }
  } catch (dbError) {
    console.error(`DB cache lookup failed for place ID ${placeId}:`, dbError);
  }

  const apiKey = process.env.Maps_API_KEY;
  if (!apiKey) {
    console.error("Maps_API_KEY environment variable not set.");
    return null;
  }

  const fields = "name,formatted_address,geometry/location,place_id";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=${fields}`;
  let googlePlaceData;

  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Google API responded with status: ${response.status}`);
    const data = await response.json();
    if (data.status !== "OK")
      throw new Error(
        `Google API status: ${data.status}. ${data.error_message || ""}`,
      );
    googlePlaceData = data.result;
    if (
      !googlePlaceData?.name ||
      !googlePlaceData?.formatted_address ||
      !googlePlaceData?.place_id
    ) {
      throw new Error("Google API response missing essential details.");
    }
  } catch (fetchError) {
    console.error(
      `Failed to fetch details from Google API for place ID ${placeId}:`,
      fetchError,
    );
    return null;
  }

  const placeToCache = {
    id: googlePlaceData.place_id,
    name: googlePlaceData.name,
    address: googlePlaceData.formatted_address,
    latitude: googlePlaceData.geometry?.location?.lat ?? null,
    longitude: googlePlaceData.geometry?.location?.lng ?? null,
    lastFetchedAt: new Date(),
    generative_summary: googlePlaceData.generative_summary || "",
    // isVerified will default to false in DB on new insert
  };

  try {
    const result = await db
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
          // isVerified is NOT updated here to preserve its manually set value
        },
      })
      .returning(); // Returns all columns of the inserted/updated row

    if (result?.[0]) {
      return result[0] as SelectPlace; // Cast to ensure isVerified is typed
    } else {
      // Fallback to re-fetch from DB if returning() is problematic or to ensure latest state
      const updatedPlace = await db.query.placesTable?.findFirst({
        where: eq(placesTable.id, placeId),
      });
      if (updatedPlace) return updatedPlace;
      throw new Error(
        "Failed to insert or update cache, or retrieve after operation.",
      );
    }
  } catch (dbError) {
    console.error(
      `DB cache update/insert failed for place ID ${placeId}:`,
      dbError,
    );
    // Fallback: return fetched Google data, assuming isVerified is false
    // and ensuring all fields of SelectPlace are present.
    const fallbackData: SelectPlace = {
      id: placeToCache.id,
      name: placeToCache.name,
      address: placeToCache.address,
      latitude: placeToCache.latitude,
      longitude: placeToCache.longitude,
      lastFetchedAt: placeToCache.lastFetchedAt,
      generativeSummary: placeToCache.generative_summary || "",
      isVerified: false,
    };
    return fallbackData;
  }
}

export async function submitCheckIn(
  previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();
  const user = await getUser();

  if (!authenticated || !user?.id) {
    return { success: false, message: "User not authenticated." };
  }
  const userKindeId = user.id;

  const selectedPlaceId = formData.get("selectedPlaceId") as string | null;
  const topicPreference = formData.get("topicPreference") as string | null;
  const statusPreference = formData.get("status") as
    | "available"
    | "busy"
    | null; // More specific type
  const userLatitudeStr = formData.get("userLatitude") as string | null;
  const userLongitudeStr = formData.get("userLongitude") as string | null;

  if (!selectedPlaceId) {
    return { success: false, message: "No place selected." };
  }
  if (!statusPreference || !["available", "busy"].includes(statusPreference)) {
    return { success: false, message: "Invalid status selected." };
  }
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
    placeDetails.longitude,
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
    const thresholdTime = new Date(Date.now() - CHECKIN_UPDATE_WINDOW_MS);
    const existingCheckin = await db.query.checkinsTable.findFirst({
      where: and(
        eq(checkinsTable.userId, userKindeId),
        eq(checkinsTable.placeId, placeDetails.id),
      ),
      orderBy: desc(checkinsTable.createdAt), // Get most recent for this user/place
      columns: { id: true, createdAt: true },
    });

    const isRecentExisting =
      existingCheckin && existingCheckin.createdAt > thresholdTime;

    if (isRecentExisting) {
      operationType = "update";
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
      operationType = "insert";
      const newCheckinData: InsertCheckin = {
        userId: userKindeId,
        placeId: placeDetails.id,
        placeName: placeDetails.name,
        placeAddress: placeDetails.address,
        latitude: placeDetails.latitude,
        longitude: placeDetails.longitude,
        status: statusPreference,
        topic: topicPreference?.trim() || null,
      };
      const insertResult = await db
        .insert(checkinsTable)
        .values(newCheckinData)
        .returning({ id: checkinsTable.id });
      if (!insertResult?.[0]?.id) {
        throw new Error("Database insertion failed for new check-in.");
      }
      checkinId = insertResult[0].id;
    }
  } catch (error: unknown) {
    let message = "Database error during check-in.";
    if (error instanceof Error) message = error.message;
    return { success: false, message };
  }

  console.log(
    `User ${userKindeId} ${operationType} check-in for ${placeDetails.name} (ID: ${checkinId})`,
  );
  redirect(`/places/${placeDetails.id}`);
}

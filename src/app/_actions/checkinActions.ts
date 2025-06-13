// src/app/_actions/checkinActions.ts
"use server";

import { db } from "@/lib/db";
import {
  checkinsTable,
  placesTable,
  type SelectPlace,
  type InsertCheckin,
} from "@/lib/newSchema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { and, eq, sql, desc } from "drizzle-orm";
import { calculateDistance } from "@/lib/utils";
import { checkInSchema } from "@/lib/validators/checkin";
import { ensureUserInDb } from "@/utils/supabase/ensureUserInDb";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = {
  success: boolean;
  message: string;
  checkinId?: number;
};

const CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000;
const CHECKIN_UPDATE_WINDOW_MS = 2 * 60 * 60 * 1000;
const MAX_CHECKIN_DISTANCE_METERS = 100000;

interface GooglePlaceDetailsNewResult {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text: string; languageCode?: string };
}

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
      if (!isStale) return cachedPlace;
    }
  } catch (dbError) {
    console.error(`DB cache lookup failed for place ID ${placeId}:`, dbError);
  }
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) {
    console.error("PLACES_API_KEY environment variable not set.");
    return null;
  }
  const fieldsToRequest =
    "id,displayName,formattedAddress,location,primaryTypeDisplayName";
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  let googlePlaceData: GooglePlaceDetailsNewResult;
  try {
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldsToRequest,
      },
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(
        `Google Place Details (New) API request failed: ${errorBody.error?.message || response.statusText}`,
      );
    }
    googlePlaceData = await response.json();
    if (!googlePlaceData?.id || !googlePlaceData?.displayName?.text) {
      throw new Error(
        "Google Place Details (New) API response missing essential details (id, displayName).",
      );
    }
  } catch (fetchError) {
    console.error(
      `Failed to fetch details from Google API (New) for place ID ${placeId}:`,
      fetchError,
    );
    return null;
  }
  const placeToCache = {
    id: googlePlaceData.id,
    name: googlePlaceData.displayName.text,
    address: googlePlaceData.formattedAddress || "Address not available",
    latitude: googlePlaceData.location?.latitude ?? null,
    longitude: googlePlaceData.location?.longitude ?? null,
    lastFetchedAt: new Date(),
    primaryType: googlePlaceData.primaryTypeDisplayName?.text ?? null,
  };
  try {
    await db
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
          primaryType: sql.raw(`excluded.${placesTable.primaryType.name}`),
        },
      });
    const finalPlace = await db.query.placesTable?.findFirst({
      where: eq(placesTable.id, placeId),
    });
    if (finalPlace) return finalPlace;
    throw new Error(
      "Failed to retrieve after insert/update cache for Place Details.",
    );
  } catch (dbError) {
    console.error(
      `DB cache update/insert failed for place ID ${placeId}:`,
      dbError,
    );
    const fallbackData: SelectPlace = {
      ...placeToCache,
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
    | null;
  const userLatitudeStr = formData.get("userLatitude") as string | null;
  const userLongitudeStr = formData.get("userLongitude") as string | null;

  if (!selectedPlaceId)
    return { success: false, message: "No place selected." };
  if (!statusPreference || !["available", "busy"].includes(statusPreference)) {
    return { success: false, message: "Invalid status selected." };
  }
  if (!userLatitudeStr || !userLongitudeStr) {
    return {
      success: false,
      message: "Your location could not be determined.",
    };
  }
  const userLatitude = parseFloat(userLatitudeStr);
  const userLongitude = parseFloat(userLongitudeStr);
  if (isNaN(userLatitude) || isNaN(userLongitude)) {
    return { success: false, message: "Invalid location data." };
  }

  const placeDetails = await fetchAndCacheGooglePlaceDetails(selectedPlaceId);
  if (!placeDetails)
    return { success: false, message: "Could not retrieve place details." };
  if (placeDetails.latitude == null || placeDetails.longitude == null) {
    return {
      success: false,
      message: "Cannot verify proximity: Place location unknown.",
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
      message: `You seem too far away (${Math.round(distance)}m) to check in here.`,
    };
  }

  let operationType: "insert" | "update" | "find_existing_failed" =
    "find_existing_failed";
  let resultantCheckinId: number | undefined;

  try {
    const thresholdTime = new Date(Date.now() - CHECKIN_UPDATE_WINDOW_MS);
    const existingCheckin = await db.query.checkinsTable.findFirst({
      where: and(
        eq(checkinsTable.userId, userKindeId),
        eq(checkinsTable.placeId, placeDetails.id),
      ),
      orderBy: desc(checkinsTable.createdAt),
      columns: { id: true, createdAt: true },
    });

    const isRecentExisting =
      existingCheckin && new Date(existingCheckin.createdAt) > thresholdTime;

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
      if (!updateResult?.[0]?.id)
        throw new Error("DB update failed for check-in.");
      resultantCheckinId = updateResult[0].id;
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
      if (!insertResult?.[0]?.id)
        throw new Error("DB insertion failed for check-in.");
      resultantCheckinId = insertResult[0].id;
    }
  } catch (error: unknown) {
    let message = "Database error during check-in.";
    if (error instanceof Error) message = error.message;
    console.error(
      `Check-in DB operation (${operationType}) failed for user ${userKindeId} at place ${selectedPlaceId}:`,
      error,
    );
    return { success: false, message: message };
  }

  console.log(
    `User ${userKindeId} successfully ${operationType === "update" ? "updated check-in to" : "checked into"} ${placeDetails.name} (Check-in ID: ${resultantCheckinId})`,
  );

  redirect(`/places/${placeDetails.id}`);
}

export async function checkIn(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await ensureUserInDb(user);

  const rawData = {
    placeId: formData.get("placeId"),
    placeName: formData.get("placeName"),
    placeAddress: formData.get("placeAddress"),
    latitude: parseFloat(formData.get("latitude") as string),
    longitude: parseFloat(formData.get("longitude") as string),
  };

  const parsed = checkInSchema.parse(rawData);

  await db
    .update(checkinsTable)
    .set({ status: "available" })
    .where(eq(checkinsTable.userId, user.id));

  await db.insert(checkinsTable).values({
    userId: user.id,
    placeId: parsed.place_id,
    placeName: parsed.place_name,
    placeAddress: parsed.place_address,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    status: "available",
  });

  redirect(`/places/${parsed.place_id}`);
}

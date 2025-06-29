// src/app/_actions/checkinActions.ts
"use server";

import { db } from "@/lib/db";
import { checkinsTable, placesTable } from "@/lib/schema";
import { SelectPlace } from "@/lib/db/types";

import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";

import { checkInSchema } from "@/lib/validators/checkin";
import { ensureUserInDb } from "@/utils/supabase/ensureUserInDb";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = {
  success: boolean;
  message: string;
  checkinId?: number;
};

const CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000;

interface GooglePlaceDetailsNewResult {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text: string; languageCode?: string };
}

export async function fetchAndCacheGooglePlaceDetails(
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

export async function checkIn(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  for (const pair of formData.entries()) {
    console.log(pair[0], pair[1], "formData DEBUGGGGG!!%@^@");
  }

  await ensureUserInDb(user);

  const rawData = {
    placeId: formData.get("placeId"),
    placeName: formData.get("placeName"),
    placeAddress: formData.get("placeAddress"),
    latitude: parseFloat(formData.get("latitude") as string),
    longitude: parseFloat(formData.get("longitude") as string),
    topic: formData.get("topic") as string | null,
    checkinStatus: formData.get("checkinStatus") as "available" | "busy",
  };
  const parsed = checkInSchema.parse(rawData);

  // ✅ Step 1: Deactivate any previous check-ins by this user
  await db
    .update(checkinsTable)
    .set({ isActive: false, checkinStatus: "available" })
    .where(
      and(eq(checkinsTable.userId, user.id), eq(checkinsTable.isActive, true)),
    );

  // ✅ Step 2: Upsert the new check-in
  await db
    .insert(checkinsTable)
    .values({
      userId: user.id,
      placeId: parsed.place_id,
      placeName: parsed.place_name,
      placeAddress: parsed.place_address,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      checkinStatus: parsed.checkin_status, // 👈 USE THIS EXACTLY
      topic: parsed.topic,
      isActive: true,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [checkinsTable.userId],
      set: {
        placeId: parsed.place_id,
        placeName: parsed.place_name,
        placeAddress: parsed.place_address,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        checkinStatus: parsed.checkin_status, // 👈 ALSO USE THIS
        topic: parsed.topic,
        isActive: true,
        checkedOutAt: null,
        createdAt: new Date(),
      },
    });
  redirect(`/places/${parsed.place_id}`);
}

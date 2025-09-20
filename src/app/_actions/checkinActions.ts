// src/app/_actions/checkinActions.ts
"use server";

import { db } from "@/lib/db";
import { placesTable } from "@/lib/schema";
import { SelectPlace } from "@/lib/db/types";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { checkInSchema } from "@/lib/validators/checkin";
import { ensureUserInDb } from "@/utils/supabase/ensureUserInDb";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = {
  success: boolean;
  message: string;
  checkinId?: number;
};

const CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface GooglePlaceDetailsNewResult {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text: string; languageCode?: string };
}

// ✅ RESTORED: Fetch and cache Google Place details
export async function fetchAndCacheGooglePlaceDetails(
  placeId: string,
): Promise<SelectPlace | null> {
  try {
    // Check cache first
    const cachedPlace = await db.query.placesTable?.findFirst({
      where: eq(placesTable.id, placeId),
    });

    if (cachedPlace) {
      const isStale =
        new Date().getTime() - cachedPlace.lastFetchedAt.getTime() >
        CACHE_STALE_MS;
      if (!isStale) {
        console.log("✅ Using cached place data for:", placeId);
        return cachedPlace;
      }
      console.log("⚠️ Cached place data is stale, refreshing...");
    }
  } catch (dbError) {
    console.error(`DB cache lookup failed for place ID ${placeId}:`, dbError);
  }

  // Fetch from Google Places API
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_PLACES_API_KEY environment variable not set.");
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
        `Google Place Details API request failed: ${errorBody.error?.message || response.statusText}`,
      );
    }

    googlePlaceData = await response.json();

    if (!googlePlaceData?.id || !googlePlaceData?.displayName?.text) {
      throw new Error(
        "Google Place Details API response missing essential details (id, displayName).",
      );
    }
  } catch (fetchError) {
    console.error(
      `Failed to fetch details from Google API for place ID ${placeId}:`,
      fetchError,
    );
    return null;
  }

  // Prepare data for caching
  const placeToCache = {
    id: googlePlaceData.id,
    name: googlePlaceData.displayName.text,
    address: googlePlaceData.formattedAddress || "Address not available",
    latitude: googlePlaceData.location?.latitude ?? null,
    longitude: googlePlaceData.location?.longitude ?? null,
    lastFetchedAt: new Date(),
    primaryType: googlePlaceData.primaryTypeDisplayName?.text ?? null,
  };

  // Cache in database
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

    if (finalPlace) {
      console.log("✅ Place data cached successfully:", placeId);
      return finalPlace;
    }

    throw new Error(
      "Failed to retrieve after insert/update cache for Place Details.",
    );
  } catch (dbError) {
    console.error(
      `DB cache update/insert failed for place ID ${placeId}:`,
      dbError,
    );

    // Return fallback data even if caching fails
    const fallbackData: SelectPlace = {
      ...placeToCache,
      isVerified: false,
    };
    return fallbackData;
  }
}

// ✅ UPDATED: Check-in action with RLS support
export async function checkIn(formData: FormData) {
  const supabase = await createClient();

  // Get authenticated user (RLS will ensure they can only modify their own data)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  console.log("🔐 Check-in request from user:", user.id);

  // Ensure user exists in database
  await ensureUserInDb(user);

  // Parse form data
  const rawData = {
    placeId: formData.get("placeId"),
    placeName: formData.get("placeName"),
    placeAddress: formData.get("placeAddress"),
    latitude: parseFloat(formData.get("latitude") as string),
    longitude: parseFloat(formData.get("longitude") as string),
    topic: formData.get("topic") as string | null,
    checkinStatus: formData.get("checkinStatus") as "available" | "busy",
  };

  // Validate with Zod
  const parsed = checkInSchema.parse(rawData);

  console.log("📝 Check-in data validated:", {
    placeId: parsed.place_id,
    status: parsed.checkin_status,
    topic: parsed.topic,
  });

  try {
    // ✅ Step 1: Deactivate previous check-ins (using Supabase client for RLS)
    const { error: deactivateError } = await supabase
      .from("checkins")
      .update({
        is_active: false,
        checked_out_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      console.error(
        "❌ Failed to deactivate previous check-ins:",
        deactivateError,
      );
      throw new Error("Failed to deactivate previous check-ins");
    }

    console.log("✅ Previous check-ins deactivated");

    // ✅ Step 2: Create new check-in (using Supabase client for RLS)
    const { data: newCheckin, error: insertError } = await supabase
      .from("checkins")
      .insert({
        user_id: user.id,
        place_id: parsed.place_id,
        place_name: parsed.place_name,
        place_address: parsed.place_address,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        checkin_status: parsed.checkin_status,
        topic: parsed.topic,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to create check-in:", insertError);
      throw new Error(`Failed to check in: ${insertError.message}`);
    }

    console.log("✅ Check-in created:", newCheckin.id);

    // ✅ Step 3: Optionally cache place details (for faster future lookups)
    // This runs in background, doesn't block the redirect
    fetchAndCacheGooglePlaceDetails(parsed.place_id).catch((err) => {
      console.warn("⚠️ Failed to cache place details (non-critical):", err);
    });
  } catch (error) {
    console.error("❌ Check-in error:", error);
    throw error;
  }

  // Redirect to place page
  redirect(`/places/${parsed.place_id}`);
}

// ✅ NEW: Function to verify user is checked in at a place
export async function verifyCheckinAtPlace(
  userId: string,
  placeId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("checkins")
    .select("id")
    .eq("user_id", userId)
    .eq("place_id", placeId)
    .eq("is_active", true)
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Within 2 hours
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

// ✅ NEW: Function to get user's current check-in
export async function getCurrentCheckin(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .single();

  if (error) {
    console.error("Error getting current check-in:", error);
    return null;
  }

  return data;
}

// ✅ NEW: Function to check out (deactivate current check-in)
export async function checkOut() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("checkins")
    .update({
      is_active: false,
      checked_out_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) {
    console.error("Error checking out:", error);
    throw new Error("Failed to check out");
  }

  console.log("✅ User checked out successfully");
}

// ✅ NEW: Server-side check if user is at place (uses RLS-safe function)
export async function verifyUserAtPlace(
  userId: string,
  placeId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return false;
  }

  // Call the SECURITY DEFINER function
  const { data, error } = await supabase.rpc("is_user_checked_in_at_place", {
    user_id_param: userId,
    place_id_param: placeId,
  });

  if (error) {
    console.error("Error checking user location:", error);
    return false;
  }

  return data === true;
}

// ✅ NEW: Get user's current places
export async function getUserActivePlaces(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_user_active_places", {
    user_id_param: userId,
  });

  if (error) {
    console.error("Error getting active places:", error);
    return [];
  }

  return data?.map((row: { place_id: string }) => row.place_id) || [];
}

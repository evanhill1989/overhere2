"use server";

import { db } from "@/lib/db";
import { placesTable } from "@/lib/schema";

import { eq, sql } from "drizzle-orm";

import {
  // Branded types

  type PlaceId,
  type CheckinId,
  // Domain entities
  type Place,
  placeSchema,
  userIdSchema,
  // Form/Input schemas
} from "@/lib/types/database";
import { createCheckinSchema } from "@/lib/types/core";

import { ensureUserInDb } from "@/utils/supabase/ensureUserInDb";
import { createClient } from "@/utils/supabase/server";
import {
  checkServerActionRateLimit,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/serverActionRateLimit";

// ✅ Updated return type with branded types
export type ActionResult = {
  success: boolean;
  message: string;
  checkinId?: CheckinId;
};

const CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface GooglePlaceDetailsNewResult {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text: string; languageCode?: string };
}

// ============================================
// PLACE CACHING (Updated with branded types)
// ============================================

export async function fetchAndCacheGooglePlaceDetails(
  placeId: PlaceId, // ✅ Branded type
): Promise<Place | null> {
  // ✅ Updated return type to canonical 'Place'
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
        // ⚠️ CRITICAL STEP: Map Drizzle result to canonical domain type
        // The raw 'cachedPlace' from Drizzle might have different type structures
        // (e.g., date objects, non-branded ID strings) than your canonical 'Place'.
        // You MUST parse it with Zod to apply branding and consistent types (like
        // converting DB dates to your desired 'ValidatedTimestamp' or 'Date').
        try {
          return placeSchema.parse({
            id: cachedPlace.id,
            name: cachedPlace.name, // Assuming a column name change
            address: cachedPlace.address, // Assuming a column name change
            latitude: cachedPlace.latitude,
            longitude: cachedPlace.longitude,
            lastFetchedAt: cachedPlace.lastFetchedAt, // Ensure this matches timestamp type
            isVerified: cachedPlace.isVerified,
            primaryType: cachedPlace.primaryType,
          }) as Place;
        } catch (parseError) {
          console.error("❌ Failed to parse cached Place data:", parseError);
          // Fall through to re-fetch if cached data is malformed
        }
      }
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
  // NOTE: When inserting, the structure needs to match the DB/Drizzle schema
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
      // ⚠️ CRITICAL STEP: Map Drizzle result to canonical domain type
      return placeSchema.parse({
        id: finalPlace.id,
        name: finalPlace.name, // Assuming a column name change
        address: finalPlace.address, // Assuming a column name change
        latitude: finalPlace.latitude,
        longitude: finalPlace.longitude,
        lastFetchedAt: finalPlace.lastFetchedAt,
        isVerified: finalPlace.isVerified,
        primaryType: finalPlace.primaryType,
      }) as Place;
    }

    throw new Error(
      "Failed to retrieve after insert/update cache for Place Details.",
    );
  } catch (dbError) {
    console.error(
      `DB cache update/insert failed for place ID ${placeId}:`,
      dbError,
    );

    // Return fallback data, parsed to ensure it's a canonical Place object
    // Note: The fields here must match what placeSchema expects for a Place object
    try {
      return placeSchema.parse({
        id: placeToCache.id,
        name: placeToCache.name,
        address: placeToCache.address,
        latitude: placeToCache.latitude,
        longitude: placeToCache.longitude,
        lastFetchedAt: placeToCache.lastFetchedAt,
        primaryType: placeToCache.primaryType,
        isVerified: false, // Default fallback value
      }) as Place;
    } catch (e) {
      console.error("❌ Fallback data failed canonical validation:", e);
      return null;
    }
  }
}

// ============================================
// CHECK-IN ACTION (Updated with new type system)
// ============================================

// ✅ Updated input type for better type safety
type CheckInInput = {
  placeId: string;
  placeName: string;
  placeAddress: string;
  latitude: number;
  longitude: number;
  topic?: string | null;
  checkinStatus: "available" | "busy";
};

export async function checkIn(
  formData: FormData,
): Promise<{ placeId: PlaceId }> {
  // Rate limiting check FIRST
  const rateLimitResult = await checkServerActionRateLimit(
    RATE_LIMIT_CONFIGS.checkin,
  );

  if (!rateLimitResult.success) {
    throw new Error(rateLimitResult.error || "Rate limit exceeded");
  }

  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // ✅ Parse user ID as branded type
  const userId = userIdSchema.parse(user.id);

  // Ensure user exists in database
  await ensureUserInDb(user);

  // ✅ Parse and validate all form data with branded types
  try {
    // Extract raw form data
    const rawInput: CheckInInput = {
      placeId: formData.get("placeId") as string,
      placeName: formData.get("placeName") as string,
      placeAddress: formData.get("placeAddress") as string,
      latitude: parseFloat(formData.get("latitude") as string),
      longitude: parseFloat(formData.get("longitude") as string),
      topic: (formData.get("topic") as string | null) || null,
      checkinStatus: formData.get("checkinStatus") as "available" | "busy",
    };

    // ✅ Validate with comprehensive schema
    const validated = createCheckinSchema.parse({
      userId,
      placeId: rawInput.placeId,
      placeName: rawInput.placeName,
      placeAddress: rawInput.placeAddress,
      coordinates: {
        latitude: rawInput.latitude,
        longitude: rawInput.longitude,
      },
      topic: rawInput.topic,
      checkinStatus: rawInput.checkinStatus,
      isActive: true,
    });

    // ✅ Step 1: Cache place details in background
    const cachedPlace = await fetchAndCacheGooglePlaceDetails(
      validated.placeId,
    );

    if (!cachedPlace) {
      throw new Error(`Failed to cache place details for ${validated.placeId}`);
    }

    fetchAndCacheGooglePlaceDetails(validated.placeId).catch((err) => {
      console.warn("⚠️ Failed to cache place details (non-critical):", err);
    });

    // ✅ Step 2: Check for existing check-in at this place (within 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const { data: existingCheckin } = await supabase
      .from("checkins")
      .select("*")
      .eq("user_id", validated.userId)
      .eq("place_id", validated.placeId)
      .gte("created_at", twelveHoursAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ✅ Step 3: If recent check-in exists at same place, reactivate it
    if (existingCheckin) {
      console.log("♻️ Reactivating existing check-in:", existingCheckin.id);

      // Deactivate any OTHER active check-ins (different places)
      const { error: deactivateOthersError } = await supabase
        .from("checkins")
        .update({
          is_active: false,
          checked_out_at: new Date().toISOString(),
        })
        .eq("user_id", validated.userId)
        .eq("is_active", true)
        .neq("id", existingCheckin.id);

      if (deactivateOthersError) {
        console.error(
          "❌ Failed to deactivate other check-ins:",
          deactivateOthersError,
        );
        throw new Error("Failed to deactivate other check-ins");
      }

      // Reactivate the existing check-in at this place
      const { error: reactivateError } = await supabase
        .from("checkins")
        .update({
          is_active: true,
          checked_out_at: null,
        })
        .eq("id", existingCheckin.id);

      if (reactivateError) {
        console.error("❌ Failed to reactivate check-in:", reactivateError);
        throw new Error("Failed to reactivate check-in");
      }

      return { placeId: validated.placeId };
    }

    // ✅ Step 4: No recent check-in exists, deactivate all and create new
    const { error: deactivateError } = await supabase
      .from("checkins")
      .update({
        is_active: false,
        checked_out_at: new Date().toISOString(),
      })
      .eq("user_id", validated.userId)
      .eq("is_active", true);

    if (deactivateError) {
      console.error(
        "❌ Failed to deactivate previous check-ins:",
        deactivateError,
      );
      throw new Error("Failed to deactivate previous check-ins");
    }

    // ✅ Step 5: Create new check-in with validated data
    const { error: insertError } = await supabase
      .from("checkins")
      .insert({
        user_id: validated.userId,
        place_id: validated.placeId,
        place_name: validated.placeName,
        place_address: validated.placeAddress,
        latitude: validated.coordinates?.latitude ?? null,
        longitude: validated.coordinates?.longitude ?? null,
        checkin_status: validated.checkinStatus,
        topic: validated.topic ?? null,
        is_active: validated.isActive,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to create check-in:", insertError);
      throw new Error(`Failed to check in: ${insertError.message}`);
    }

    // Redirect to place page
    return { placeId: validated.placeId };
  } catch (error) {
    console.error("❌ Check-in validation or processing error:", error);
    throw error;
  }
}

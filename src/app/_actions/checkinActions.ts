// src/app/_actions/checkinActions.ts
"use server";

import { db } from "@/index";
// Import the new placesTable schema and types
import {
  checkinsTable,
  placesTable,
  usersTable,
  type SelectPlace,
} from "@/db/schema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm"; // Import eq and excluded

export type ActionResult = {
  success: boolean;
  message: string;
  checkinId?: number;
};

// --- Helper Function: Fetch/Cache Google Place Details ---

// Cache duration - e.g., 30 days in milliseconds
const CACHE_STALE_MS = 30 * 24 * 60 * 60 * 1000;

async function fetchAndCacheGooglePlaceDetails(
  placeId: string
): Promise<SelectPlace | null> {
  // 1. Check Cache (Local DB)
  try {
    const cachedPlace = await db.query.placesTable?.findFirst({
      where: eq(placesTable.id, placeId),
    });

    if (cachedPlace) {
      const now = new Date();
      const isStale =
        now.getTime() - cachedPlace.lastFetchedAt.getTime() > CACHE_STALE_MS;
      if (!isStale) {
        console.log(`Cache hit for place ID: ${placeId}`);
        return cachedPlace; // Return fresh cached data
      }
      console.log(`Cache stale for place ID: ${placeId}`);
    } else {
      console.log(`Cache miss for place ID: ${placeId}`);
    }
  } catch (dbError) {
    console.error(`DB cache lookup failed for place ID ${placeId}:`, dbError);
    // Proceed to fetch from Google even if DB lookup fails
  }

  // 2. Cache Miss or Stale: Fetch from Google API
  const apiKey = process.env.Maps_API_KEY;
  if (!apiKey) {
    console.error("Maps_API_KEY environment variable not set.");
    // If cache exists but is stale, maybe return stale data? Or null.
    // Returning null here means check-in fails if API key is missing and cache is stale/miss.
    return null;
  }

  const fields = "name,formatted_address,geometry/location"; // Request needed fields
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=${fields}`;

  let googlePlaceData;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google API responded with status: ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== "OK") {
      throw new Error(
        `Google API status: ${data.status}. ${data.error_message || ""}`
      );
    }
    googlePlaceData = data.result;

    if (
      !googlePlaceData ||
      !googlePlaceData.name ||
      !googlePlaceData.formatted_address
    ) {
      throw new Error(
        "Google API response missing essential details (name/address)."
      );
    }
  } catch (fetchError) {
    console.error(
      `Failed to fetch details from Google API for place ID ${placeId}:`,
      fetchError
    );
    // If cache exists but is stale, maybe return stale data? Or null.
    // Returning null here means check-in fails if Google fetch fails and cache is stale/miss.
    return null;
  }

  // 3. Store/Update Cache (Local DB)
  const placeToCache = {
    id: placeId,
    name: googlePlaceData.name,
    address: googlePlaceData.formatted_address,
    latitude: googlePlaceData.geometry?.location?.lat ?? null,
    longitude: googlePlaceData.geometry?.location?.lng ?? null,
    lastFetchedAt: new Date(), // Update timestamp
  };

  try {
    // Use INSERT ... ON CONFLICT DO UPDATE (Upsert)
    const updatedOrInserted = await db
      .insert(placesTable)
      .values(placeToCache)
      .onConflictDoUpdate({
        // If placeId already exists
        target: placesTable.id,
        set: {
          // Using sql.raw based on Drizzle docs example
          // Get the actual DB column name via .name property
          name: sql.raw(`excluded.${placesTable.name.name}`),
          address: sql.raw(`excluded.${placesTable.address.name}`),
          latitude: sql.raw(`excluded.${placesTable.latitude.name}`),
          longitude: sql.raw(`excluded.${placesTable.longitude.name}`),
          lastFetchedAt: sql.raw(`excluded.${placesTable.lastFetchedAt.name}`),
        },
      })
      .returning();

    if (updatedOrInserted && updatedOrInserted.length > 0) {
      console.log(`Cache updated/inserted for place ID: ${placeId}`);
      return updatedOrInserted[0]; // Return the fresh data just cached
    } else {
      throw new Error("Failed to insert or update cache in DB.");
    }
  } catch (dbError) {
    console.error(
      `DB cache update/insert failed for place ID ${placeId}:`,
      dbError
    );
    // Even if caching fails, we got data from Google, so return it for this check-in attempt
    // Map the fetched google data to SelectPlace type structure
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

// --- Updated Server Action ---

export async function submitCheckIn(
  previousState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const { getUser, isAuthenticated } = getKindeServerSession();

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.warn("Submit check-in attempt by unauthenticated user.");
    return { success: false, message: "User not authenticated." };
  }

  const user = await getUser();
  // Ensure usersTable uses kinde_id as reference if needed, or adjust check below
  if (!user || !user.id) {
    console.error("Authenticated user details could not be retrieved.");
    return { success: false, message: "Could not retrieve user details." };
  }
  // Assuming you store Kinde ID in your usersTable and reference it in checkinsTable
  const userKindeId = user.id; // Kinde provides the user ID

  const selectedPlaceId = formData.get("selectedPlaceId") as string | null; // Google Place ID
  console.log(
    `User ${userKindeId} attempting check-in for place ID: ${selectedPlaceId}`
  );

  if (!selectedPlaceId) {
    return { success: false, message: "No place selected from the form." };
  }

  // --- Use the caching helper function ---
  const placeDetails = await fetchAndCacheGooglePlaceDetails(selectedPlaceId);
  // --- ---

  if (!placeDetails) {
    console.error(
      `Failed to fetch or cache place details for ID: ${selectedPlaceId}. Check previous errors.`
    );
    // Provide a more informative error if possible, depends on why fetchAndCache failed
    return {
      success: false,
      message: `Could not retrieve details for the selected place. Please try again.`,
    };
  }

  console.log("Using place details for check-in:", placeDetails);

  // Insert the check-in record using details from cache/Google
  try {
    const newCheckin = await db
      .insert(checkinsTable)
      .values({
        // Ensure this matches the foreign key reference in checkinsTable schema
        // If checkinsTable.userId references usersTable.kinde_id (varchar), use userKindeId
        userId: userKindeId,
        placeId: placeDetails.id, // Google Place ID
        placeName: placeDetails.name,
        placeAddress: placeDetails.address,
        latitude: placeDetails.latitude, // Use the field name from SelectPlace/placesTable
        longitude: placeDetails.longitude, // Use the field name from SelectPlace/placesTable
        // createdAt handled by defaultNow()
      })
      .returning({ id: checkinsTable.id });

    if (!newCheckin || newCheckin.length === 0 || !newCheckin[0]?.id) {
      console.error(
        "Failed to insert check-in into database or retrieve new ID."
      );
      throw new Error("Database insertion failed or did not return ID.");
    }

    const checkinId = newCheckin[0].id;
    console.log(
      `User ${userKindeId} successfully checked into ${placeDetails.name} (Check-in ID: ${checkinId})`
    );

    revalidatePath("/");

    return {
      success: true,
      message: `Successfully checked into ${placeDetails.name}!`,
      checkinId: checkinId,
    };
  } catch (error: any) {
    console.error(
      `Check-in DB insert failed for user ${userKindeId} at place ${selectedPlaceId}:`,
      error
    );
    // Check for specific DB errors if needed (e.g., foreign key constraint)
    return {
      success: false,
      message: `Check-in failed: ${
        error.message || "A database error occurred."
      }`,
    };
  }
}

// src/app/_actions/checkinQueries.ts
"use server";

import { db } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { checkinsTable } from "@/lib/schema";
import { subHours } from "date-fns";
import {
  type PlaceId,
  type Checkin,
  placeIdSchema,
  checkinSchema,
} from "@/lib/types/database";

export async function getCheckinsAtPlace(placeId: PlaceId): Promise<Checkin[]> {
  console.log("🔍 [getCheckinsAtPlace] Starting fetch for placeId:", placeId);

  const validatedPlaceId = placeIdSchema.parse(placeId);
  console.log("✅ [getCheckinsAtPlace] PlaceId validated:", validatedPlaceId);

  const twoHoursAgo = subHours(new Date(), 2);
  console.log(
    "⏰ [getCheckinsAtPlace] Fetching checkins since:",
    twoHoursAgo.toISOString(),
  );

  const rawCheckins = await db
    .select()
    .from(checkinsTable)
    .where(
      and(
        eq(checkinsTable.placeId, validatedPlaceId),
        eq(checkinsTable.isActive, true),
        gt(checkinsTable.createdAt, twoHoursAgo),
      ),
    );

  console.log(
    "📦 [getCheckinsAtPlace] Raw checkins from Drizzle:",
    rawCheckins.length,
  );
  console.log(
    "📦 [getCheckinsAtPlace] Raw data structure:",
    JSON.stringify(rawCheckins[0], null, 2),
  );

  const validatedCheckins = rawCheckins.map((checkin, index) => {
    console.log(
      `🔄 [getCheckinsAtPlace] Validating checkin ${index}:`,
      checkin.id,
    );
    try {
      const validated = checkinSchema.parse(checkin);
      console.log(
        `✅ [getCheckinsAtPlace] Checkin ${index} validated successfully`,
      );
      return validated;
    } catch (error) {
      console.error(
        `❌ [getCheckinsAtPlace] Checkin ${index} validation failed:`,
        error,
      );
      throw error;
    }
  });

  console.log(
    `🎉 [getCheckinsAtPlace] Returning ${validatedCheckins.length} validated checkins`,
  );
  return validatedCheckins;
}

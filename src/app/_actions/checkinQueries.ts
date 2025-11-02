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
  const validatedPlaceId = placeIdSchema.parse(placeId);

  const twoHoursAgo = subHours(new Date(), 2);

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

  const validatedCheckins = rawCheckins.map((checkin) => {
    try {
      const validated = checkinSchema.parse(checkin);
      return validated;
    } catch (error) {
      console.error(
        `❌ [getCheckinsAtPlace] Checkin validation failed:`,
        error,
      );
      throw error;
    }
  });

  return validatedCheckins;
}

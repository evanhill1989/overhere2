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
        gt(checkinsTable.createdAt, twoHoursAgo),
      ),
    );

  // ✅ Map to canonical camelCase INSIDE the server action
  return rawCheckins.map((checkin) => checkinSchema.parse(checkin));
}

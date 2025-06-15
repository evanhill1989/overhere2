// app/_actions/messageActions.ts
"use server";

import { db } from "@/lib/db";
import {
  messageSessionRequestsTable,
  failedMessageRequests,
} from "@/lib/newSchema";
import { eq, and } from "drizzle-orm";

export async function requestToMessage({
  initiatorId,
  initiateeId,
  placeId,
  checkinId,
}: {
  initiatorId: string;
  initiateeId: string;
  placeId: string;
  checkinId: number;
}) {
  try {
    // Check for existing message request
    const existing = await db.query.messageSessionRequestsTable.findFirst({
      where: and(
        eq(messageSessionRequestsTable.initiatorId, initiatorId),
        eq(messageSessionRequestsTable.initiateeId, initiateeId),
        eq(messageSessionRequestsTable.placeId, placeId),
      ),
    });

    if (existing) {
      return { success: false, error: "Duplicate request" };
    }

    await db.insert(messageSessionRequestsTable).values({
      initiatorId,
      initiateeId,
      placeId,
      checkinId,
    });

    return { success: true };
  } catch (error) {
    console.error(error);

    await db.insert(failedMessageRequests).values({
      initiatorId,
      initiateeId,
      placeId,
      reason: "Server error",
    });

    return { success: false, error: "Unexpected server error" };
  }
}

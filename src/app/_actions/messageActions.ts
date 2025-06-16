// app/_actions/messageActions.ts
"use server";

import { db } from "@/lib/db";
import {
  messageSessionRequestsTable,
  messageSessionsTable,
  failedMessageRequests,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export async function requestToMessage({
  initiatorId,
  initiateeId,
  placeId,
}: {
  initiatorId: string;
  initiateeId: string;
  placeId: string;
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

export async function respondToMessageRequest({
  requestId,
  userId,
  action,
}: {
  requestId: string;
  userId: string;
  action: "accepted" | "rejected" | "canceled";
}) {
  const request = await db.query.messageSessionRequestsTable.findFirst({
    where: eq(messageSessionRequestsTable.id, requestId),
  });

  if (!request) {
    return { success: false, message: "Request not found." };
  }

  const isInitiator = request.initiatorId === userId;
  const isInitiatee = request.initiateeId === userId;

  if (action === "canceled" && !isInitiator) {
    return { success: false, message: "Only sender can cancel." };
  }

  if ((action === "accepted" || action === "rejected") && !isInitiatee) {
    return { success: false, message: "Only receiver can respond." };
  }

  await db
    .update(messageSessionRequestsTable)
    .set({ status: action })
    .where(eq(messageSessionRequestsTable.id, requestId));

  return { success: true, message: `Request ${action}.` };
}

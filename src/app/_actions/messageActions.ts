// app/_actions/messageActions.ts
"use server";

import { db } from "@/lib/db";
import {
  messageSessionRequestsTable,
  messageSessionsTable,
  failedMessageRequests,
} from "@/lib/newSchema";
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

export async function respondToMessageRequest(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const response = formData.get("response") as
    | "accepted"
    | "rejected"
    | "canceled";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated." };
  }

  const request = await db.query.messageSessionRequestsTable.findFirst({
    where: eq(messageSessionRequestsTable.id, requestId),
  });

  if (!request) {
    return { success: false, message: "Request not found." };
  }

  if (
    response === "accepted" &&
    request.initiatorId !== user.id &&
    request.initiateeId === user.id
  ) {
    // Create message session
    await db.insert(messageSessionsTable).values({
      placeId: request.placeId,
      initiatorId: request.initiatorId,
      initiateeId: request.initiateeId,
      status: "accepted",
    });
  }

  // Update request status
  await db
    .update(messageSessionRequestsTable)
    .set({ status: response })
    .where(eq(messageSessionRequestsTable.id, requestId));

  return { success: true, message: `Request ${response}.` };
}

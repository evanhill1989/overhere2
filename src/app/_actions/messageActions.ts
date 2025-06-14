// app/_actions/messageActions.ts
"use server";

import { db } from "@/lib/db";
import { messageRequests, failedMessageRequests } from "@/lib/newSchema";
import { eq, and } from "drizzle-orm";

export async function requestMessage({
  senderId,
  recipientId,
  placeId,
}: {
  senderId: string;
  recipientId: string;
  placeId: string;
}) {
  try {
    // Check for existing message request
    const existing = await db.query.messageRequests.findFirst({
      where: and(
        eq(messageRequests.senderId, senderId),
        eq(messageRequests.recipientId, recipientId),
        eq(messageRequests.placeId, placeId),
      ),
    });

    if (existing) {
      return { success: false, error: "Duplicate request" };
    }

    await db.insert(messageRequests).values({
      senderId,
      recipientId,
      placeId,
    });

    return { success: true };
  } catch (error) {
    console.error(error);

    await db.insert(failedMessageRequests).values({
      senderId,
      recipientId,
      placeId,
      reason: "Server error",
    });

    return { success: false, error: "Unexpected server error" };
  }
}

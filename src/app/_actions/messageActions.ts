// app/_actions/messageActions.ts
"use server";

import { db } from "@/lib/db";
import {
  messageSessionRequestsTable,
  messageSessionsTable,
  failedMessageRequests,
  messagesTable,
} from "@/lib/schema";
import { eq, and, or, gt } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { subHours } from "date-fns";

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
    console.log("↪️ requestToMessage called with:", {
      initiatorId,
      initiateeId,
      placeId,
    });
    const existing = await db.query.messageSessionRequestsTable.findFirst({
      where: and(
        eq(messageSessionRequestsTable.initiatorId, initiatorId),
        eq(messageSessionRequestsTable.initiateeId, initiateeId),
        eq(messageSessionRequestsTable.placeId, placeId),
      ),
    });

    if (existing) {
      const terminalStatuses = ["rejected", "canceled", "accepted"];
      if (!terminalStatuses.includes(existing.status)) {
        console.warn("⚠️ Duplicate request (active or pending)");
        return { success: false, error: "Duplicate request" };
      }

      // Optional: if you're OK re-requesting, you could update status back to pending here
      // or delete and insert a fresh one.
    }

    await db.insert(messageSessionRequestsTable).values({
      initiatorId,
      initiateeId,
      placeId,
      status: "pending",
    });

    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ Exception in requestToMessage", {
      error,
      initiatorId,
      initiateeId,
      placeId,
    });

    await db.insert(failedMessageRequests).values({
      initiatorId,
      initiateeId,
      placeId,
      reason: error?.message || "Unexpected server error",
    });

    console.log("📝 Logged failed message request");
    return { success: false, error: "Unexpected server error" };
  }
}

export async function respondToMessageRequest(
  prevState: { message: string },
  formData: FormData,
): Promise<{ message: string }> {
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
    return { message: "Not authenticated." };
  }

  const request = await db.query.messageSessionRequestsTable.findFirst({
    where: eq(messageSessionRequestsTable.id, requestId),
  });

  if (!request) {
    return { message: "Request not found." };
  }

  if (
    response === "accepted" &&
    request.initiatorId !== user.id &&
    request.initiateeId === user.id
  ) {
    await db.insert(messageSessionsTable).values({
      placeId: request.placeId,
      initiatorId: request.initiatorId,
      initiateeId: request.initiateeId,
      status: "accepted",
    });
  }

  await db
    .update(messageSessionRequestsTable)
    .set({ status: response })
    .where(eq(messageSessionRequestsTable.id, requestId));

  return { message: `Request ${response}.` };
}

export async function getMessageSession({
  userId,
  placeId,
}: {
  userId: string;
  placeId: string;
}) {
  const twoHoursAgo = subHours(new Date(), 2);

  const session = await db.query.messageSessionsTable.findFirst({
    where: and(
      eq(messageSessionsTable.placeId, placeId),
      or(
        eq(messageSessionsTable.initiatorId, userId),
        eq(messageSessionsTable.initiateeId, userId),
      ),
      gt(messageSessionsTable.createdAt, twoHoursAgo),
    ),
  });

  return session;
}

import type { InferSelectModel } from "drizzle-orm";

type MessageRow = InferSelectModel<typeof messagesTable>;

export async function submitMessage(
  prev: { ok: boolean; newMessage: MessageRow | null; error: string },
  formData: FormData,
) {
  try {
    const sessionId = formData.get("sessionId") as string;
    const senderCheckinId = Number(formData.get("senderCheckinId"));
    const content = (formData.get("content") as string).trim();

    if (!content) return { ok: false, newMessage: null, error: "Empty" };

    const [row] = await db
      .insert(messagesTable)
      .values({ sessionId, senderCheckinId, content })
      .returning();

    return { ok: true, newMessage: row, error: "" };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("submitMessage failed:", error);
    return { ok: false, newMessage: null, error: error.message };
  }
}

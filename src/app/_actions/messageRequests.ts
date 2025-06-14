// src/app/_actions/messageRequests.ts
"use server";

import { db } from "@/lib/db";
import { messageRequestsTable, failedMessageRequests } from "@/lib/newSchema";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

const messageRequestSchema = z.object({
  senderId: z.string().min(1),
  receiverId: z.string().min(1),
  checkinId: z.string().uuid(),
  message: z.string().min(1).max(280),
});

export async function submitMessageRequest(formData: FormData) {
  const parsed = messageRequestSchema.safeParse({
    senderId: formData.get("senderId"),
    receiverId: formData.get("receiverId"),
    checkinId: formData.get("checkinId"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid message request data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  try {
    await db.insert(messageRequestsTable).values({
      senderId: parsed.data.senderId,
      receiverId: parsed.data.receiverId,
      checkinId: Number(parsed.data.checkinId),
      message: parsed.data.message,
      status: "pending",
    });

    return {
      success: true,
      message: "Message request sent successfully",
    };
  } catch (error: unknown) {
    console.error(error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return {
        success: false,
        message:
          "You’ve already requested to message this person at this check-in.",
      };
    }

    console.error("Failed to insert message request:", error);

    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}

export async function logFailedRequestAttempt({
  senderId,
  recipientId,
  placeId,
  reason,
}: {
  senderId: string;
  recipientId: string;
  placeId: string;
  reason: string;
}) {
  await db.insert(failedMessageRequests).values({
    senderId,
    recipientId,
    placeId,
    reason,
  });
}

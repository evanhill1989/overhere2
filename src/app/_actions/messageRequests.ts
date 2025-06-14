// src/app/_actions/messageRequests.ts
"use server";

import { db } from "@/lib/db";
import { messageRequestsTable, failedMessageRequests } from "@/lib/newSchema";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

const messageRequestSchema = z.object({
  receiverId: z.string().min(1),
  checkinId: z.string().uuid(),
  message: z.string().min(1).max(280),
});

export async function submitMessageRequest(formData: FormData) {
  const parsed = messageRequestSchema.safeParse({
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
      senderId: user.id,
      receiverId: parsed.data.receiverId,
      checkinId: parsed.data.checkinId,
      message: parsed.data.message,
      status: "pending",
    });

    return {
      success: true,
      message: "Message request sent successfully",
    };
  } catch (error: any) {
    // Check for unique constraint violation
    console.error(error);
    if (error.code === "23505") {
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

// src/app/_actions/messageRequests.ts
"use server";

import { db } from "@/lib/db";
import {
  messageRequestsTable,
  failedMessageRequests,
  checkinsTable,
} from "@/lib/newSchema";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

const messageRequestSchema = z
  .object({
    senderId: z.string().uuid(),
    receiverId: z.string().uuid(),
    checkinId: z.number().int(),
    message: z.string().min(1).max(500),
  })
  .refine((data) => data.senderId !== data.receiverId, {
    message: "Sender and receiver cannot be the same user.",
    path: ["receiverId"], // Attach the error to receiverId field
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
    if (parsed.data.senderId === parsed.data.receiverId) {
      return NextResponse.json(
        { error: "You cannot request yourself." },
        { status: 400 },
      );
    }

    const [senderId, receiverId] = [
      parsed.data.senderId,
      parsed.data.receiverId,
    ];

    // Batch query both sender + receiver check-ins
    const checkins = await db
      .select()
      .from(checkinsTable)
      .where(
        and(
          inArray(checkinsTable.userId, [senderId, receiverId]),
          eq(checkinsTable.isActive, true),
        ),
      );

    const senderCheckin = checkins.find((c) => c.userId === senderId);
    const receiverCheckin = checkins.find((c) => c.userId === receiverId);

    if (!receiverCheckin) {
      return NextResponse.json(
        { error: "That person is no longer checked in." },
        { status: 400 },
      );
    }

    if (!senderCheckin) {
      return NextResponse.json(
        { error: "You are no longer checked in." },
        { status: 400 },
      );
    }

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

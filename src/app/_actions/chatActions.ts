// src/app/_actions/chatActions.ts
"use server";

import { db } from "@/index";
import { chatSessionsTable, checkinsTable, messagesTable } from "@/db/schema";
import type { InsertChatSession, InsertMessage } from "@/db/schema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { and, eq, or, gt, desc } from "drizzle-orm";

// Consider making this configurable or sharing from elsewhere
const CHAT_SESSION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours validity for finding existing sessions

export async function createOrGetChatSession(
  initiatorCheckinId: number,
  receiverCheckinId: number,
  placeId: string // Passed from client context
): Promise<{ sessionId: string | null; error?: string }> {
  const { getUser, isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated()))
    return { sessionId: null, error: "Not authenticated." };
  const user = await getUser();
  if (!user?.id) return { sessionId: null, error: "User not found." };

  if (initiatorCheckinId === receiverCheckinId) {
    return { sessionId: null, error: "Cannot chat with self." };
  }

  try {
    // Security: Verify initiator check-in belongs to the logged-in user
    const initiatorCheckin = await db.query.checkinsTable.findFirst({
      where: and(
        eq(checkinsTable.id, initiatorCheckinId),
        eq(checkinsTable.userId, user.id) // Match Kinde ID
      ),
      columns: { id: true },
    });
    if (!initiatorCheckin)
      return { sessionId: null, error: "Invalid initiator." };

    // Check for recent existing session between these two check-ins
    const thresholdTime = new Date(Date.now() - CHAT_SESSION_WINDOW_MS);
    const existingSession = await db.query.chatSessionsTable.findFirst({
      where: and(
        gt(chatSessionsTable.createdAt, thresholdTime),
        or(
          and(
            eq(chatSessionsTable.initiatorCheckinId, initiatorCheckinId),
            eq(chatSessionsTable.receiverCheckinId, receiverCheckinId)
          ),
          and(
            eq(chatSessionsTable.initiatorCheckinId, receiverCheckinId),
            eq(chatSessionsTable.receiverCheckinId, initiatorCheckinId)
          )
        )
      ),
      orderBy: desc(chatSessionsTable.createdAt), // Get newest if duplicates exist
    });

    if (existingSession) {
      console.log(`Existing chat session found: ${existingSession.id}`);
      return { sessionId: existingSession.id };
    }

    // Create new session
    const newSessionData: InsertChatSession = {
      placeId: placeId,
      initiatorCheckinId: initiatorCheckinId,
      receiverCheckinId: receiverCheckinId,
    };
    const newSessionResult = await db
      .insert(chatSessionsTable)
      .values(newSessionData)
      .returning({ id: chatSessionsTable.id });

    if (!newSessionResult?.[0]?.id)
      throw new Error("Failed to create session.");

    console.log(`New chat session created: ${newSessionResult[0].id}`);
    return { sessionId: newSessionResult[0].id };
  } catch (error: any) {
    console.error("Error in createOrGetChatSession:", error);
    return {
      sessionId: null,
      error: error.message || "Server error creating chat session.",
    };
  }
}

export async function sendMessage(
  sessionId: string, // Should be UUID from chat_sessions table
  senderCheckinId: number,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const { getUser, isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated()))
    return { success: false, error: "Not authenticated." };
  const user = await getUser();
  if (!user?.id) return { success: false, error: "User not found." };

  const trimmedContent = content?.trim();
  if (!trimmedContent) return { success: false, error: "Message is empty." };
  // Add max length check if desired, e.g., match DB column

  try {
    // Security: Verify sender check-in belongs to the logged-in user
    const senderCheckin = await db.query.checkinsTable.findFirst({
      where: and(
        eq(checkinsTable.id, senderCheckinId),
        eq(checkinsTable.userId, user.id) // Match Kinde ID
      ),
      columns: { id: true },
    });
    if (!senderCheckin) return { success: false, error: "Invalid sender." };

    // Security: Verify session exists and sender is part of it
    const validSession = await db.query.chatSessionsTable.findFirst({
      where: eq(chatSessionsTable.id, sessionId),
      columns: { initiatorCheckinId: true, receiverCheckinId: true },
    });
    if (!validSession)
      return { success: false, error: "Chat session not found." };
    if (
      validSession.initiatorCheckinId !== senderCheckinId &&
      validSession.receiverCheckinId !== senderCheckinId
    ) {
      return { success: false, error: "Sender not part of this session." };
    }

    // Insert message
    const newMessageData: InsertMessage = {
      chatSessionId: sessionId,
      senderCheckinId: senderCheckinId,
      content: trimmedContent,
    };
    await db.insert(messagesTable).values(newMessageData);

    console.log(
      `Message sent by checkin ${senderCheckinId} in session ${sessionId}`
    );
    return { success: true };
  } catch (error: any) {
    console.error(`Error sending message in session ${sessionId}:`, error);
    return {
      success: false,
      error: error.message || "Server error sending message.",
    };
  }
}

"use server";

import { db } from "@/index";
import { chatSessionsTable, checkinsTable, messagesTable } from "@/db/schema";
import type { InsertChatSession, InsertMessage } from "@/db/schema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { and, eq, or, gt, desc } from "drizzle-orm";
// import { revalidatePath } from "next/cache";

// Consider making this configurable or sharing from elsewhere
const CHAT_SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;

export async function createOrGetChatSession(
  initiatorCheckinId: number,
  receiverCheckinId: number,
  placeId: string
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
        eq(checkinsTable.userId, user.id)
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
      return { sessionId: existingSession.id };
    }

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
  } catch (error: unknown) {
    console.error("Error in createOrGetChatSession:", error);
    return {
      sessionId: null,
      error: "Server error creating chat session.",
    };
  }
}

export async function acceptChatSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Check Authentication
  const { getUser, isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return { success: false, error: "Not authenticated." };
  }
  const user = await getUser();
  if (!user?.id) {
    return { success: false, error: "User not found." };
  }

  // Basic validation for sessionId
  if (!sessionId || typeof sessionId !== "string") {
    return { success: false, error: "Invalid session ID provided." };
  }

  try {
    // --- Query 1: Get the chat session ---
    const sessionToAccept = await db.query.chatSessionsTable.findFirst({
      where: eq(chatSessionsTable.id, sessionId),
      columns: { id: true, status: true, receiverCheckinId: true },
      // REMOVED 'with' clause
    });

    // 3. Validate Session Existence
    if (!sessionToAccept) {
      return { success: false, error: "Chat session not found." };
    }

    // 4. Security Check: Verify the current user IS the intended receiver
    // --- Query 2: Get the check-in details for the receiver ---
    const receiverCheckinDetails = await db.query.checkinsTable.findFirst({
      where: eq(checkinsTable.id, sessionToAccept.receiverCheckinId),
      columns: { userId: true }, // Only need the userId associated with this checkin
    });

    // Check if check-in exists and if its userId matches the logged-in user's ID
    if (!receiverCheckinDetails || receiverCheckinDetails.userId !== user.id) {
      console.warn(
        `User ${user.id} attempted to accept session ${sessionId} intended for receiver checkin ID ${sessionToAccept.receiverCheckinId} (User ID: ${receiverCheckinDetails?.userId})`
      );
      return { success: false, error: "Not authorized to accept this chat." };
    }
    // --- End Security Check ---

    // 5. Check if already accepted or in a non-pending state
    if (sessionToAccept.status === "active") {
      console.log(`Session ${sessionId} is already active.`);
      return { success: true }; // Idempotent
    }
    if (sessionToAccept.status !== "pending") {
      return {
        success: false,
        error: `Cannot accept session with status: ${sessionToAccept.status}`,
      };
    }

    // 6. Update the session status to 'active'
    await db
      .update(chatSessionsTable)
      .set({ status: "active" }) // Set the status to 'active'
      .where(eq(chatSessionsTable.id, sessionId));

    console.log(`Chat session ${sessionId} accepted by user ${user.id}`);

    return { success: true };
  } catch (error: unknown) {
    console.error(`Error accepting chat session ${sessionId}:`, error);
    let message = "Server error accepting chat session.";
    if (error instanceof Error) {
      message = error.message;
    }
    return {
      success: false,
      error: message,
    };
  }
}

export async function rejectChatSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Check Authentication
  const { getUser, isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return { success: false, error: "Not authenticated." };
  }
  const user = await getUser();
  if (!user?.id) {
    return { success: false, error: "User not found." };
  }

  // Basic validation
  if (!sessionId || typeof sessionId !== "string") {
    return { success: false, error: "Invalid session ID provided." };
  }

  try {
    // 2. Find the session + verify receiver
    const sessionToReject = await db.query.chatSessionsTable.findFirst({
      where: eq(chatSessionsTable.id, sessionId),
      columns: { id: true, status: true, receiverCheckinId: true },
    });

    if (!sessionToReject) {
      return { success: false, error: "Chat session not found." };
    }

    // --- Query 2: Get receiver check-in details for authorization ---
    const receiverCheckinDetails = await db.query.checkinsTable.findFirst({
      where: eq(checkinsTable.id, sessionToReject.receiverCheckinId),
      columns: { userId: true },
    });

    // 3. Security Check: Verify current user IS the intended receiver
    if (!receiverCheckinDetails || receiverCheckinDetails.userId !== user.id) {
      console.warn(
        `User ${user.id} attempted to reject session ${sessionId} intended for checkin ${sessionToReject.receiverCheckinId} (User ID: ${receiverCheckinDetails?.userId})`
      );
      return { success: false, error: "Not authorized to reject this chat." };
    }

    // 4. Check Status: Only reject if pending
    if (sessionToReject.status !== "pending") {
      // If already active, rejected, closed etc., maybe just return success
      console.log(
        `Session ${sessionId} is not pending (status: ${sessionToReject.status}). Cannot reject.`
      );
      // Consider if receiver should be able to reject an 'active' chat (close it?) - current logic prevents this.
      return {
        success: false,
        error: `Cannot reject session with status: ${sessionToReject.status}`,
      };
    }

    // 5. Update status to 'rejected'
    await db
      .update(chatSessionsTable)
      .set({ status: "rejected" }) // <-- Set status to 'rejected'
      .where(eq(chatSessionsTable.id, sessionId));

    console.log(`Chat session ${sessionId} rejected by user ${user.id}`);
    return { success: true };
  } catch (error: unknown) {
    console.error(`Error rejecting chat session ${sessionId}:`, error);
    let message = "Server error rejecting chat session.";
    if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, error: message };
  }
}

export async function sendMessage(
  sessionId: string,
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

  try {
    // Security: Verify sender check-in belongs to the logged-in user
    const senderCheckin = await db.query.checkinsTable.findFirst({
      where: and(
        eq(checkinsTable.id, senderCheckinId),
        eq(checkinsTable.userId, user.id)
      ),
      columns: { id: true },
    });
    if (!senderCheckin) return { success: false, error: "Invalid sender." };

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
  } catch (error: unknown) {
    console.error(`Error sending message in session ${sessionId}:`, error);
    return {
      success: false,
      error: "Server error sending message.",
    };
  }
}

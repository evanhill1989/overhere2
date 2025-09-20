// src/app/_actions/messageActions.ts
"use server";

import { messagesTable } from "@/lib/schema";

import { createClient } from "@/utils/supabase/server";
import { subHours } from "date-fns";

// ============================================
// REQUEST TO MESSAGE (UPDATED)
// ============================================

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

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Not authenticated");
      return { success: false, error: "Not authenticated" };
    }

    // ✅ Verify initiatorId matches authenticated user
    if (user.id !== initiatorId) {
      console.error("❌ Unauthorized: initiator doesn't match user");
      return { success: false, error: "Unauthorized" };
    }

    // ✅ Check if both users are at the same place using RLS-safe function
    const { data: samePlace, error: checkError } = await supabase.rpc(
      "are_users_at_same_place",
      {
        user1_id: initiatorId,
        user2_id: initiateeId,
      },
    );

    if (checkError || !samePlace) {
      console.error("❌ Users not at same place:", checkError);
      return {
        success: false,
        error: "Both users must be at the same location",
      };
    }

    // ✅ Check for existing requests
    const { data: existingRequests } = await supabase
      .from("message_session_requests")
      .select("*")
      .eq("initiator_id", initiatorId)
      .eq("initiatee_id", initiateeId)
      .eq("place_id", placeId)
      .in("status", ["pending", "accepted"]);

    if (existingRequests && existingRequests.length > 0) {
      console.warn("⚠️ Duplicate request");
      return {
        success: false,
        error: "Request already exists",
      };
    }

    // ✅ Create request (RLS policy will enforce location check again)
    const { data: newRequest, error: insertError } = await supabase
      .from("message_session_requests")
      .insert({
        initiator_id: initiatorId,
        initiatee_id: initiateeId,
        place_id: placeId,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to create request:", insertError);
      throw insertError;
    }

    console.log("✅ Request created:", newRequest.id);
    return { success: true, data: newRequest };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ Exception in requestToMessage:", error);

    return { success: false, error: error.message };
  }
}

// ============================================
// RESPOND TO MESSAGE REQUEST (UPDATED)
// ============================================

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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("❌ Not authenticated");
    return { message: "Not authenticated." };
  }

  // ✅ Get the request using Supabase (RLS ensures we can only see our requests)
  const { data: request, error: fetchError } = await supabase
    .from("message_session_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    console.error("❌ Request not found or unauthorized:", fetchError);
    return { message: "Request not found." };
  }

  // ✅ Verify user is either initiator or initiatee
  if (request.initiator_id !== user.id && request.initiatee_id !== user.id) {
    console.error("❌ Unauthorized to respond to this request");
    return { message: "Unauthorized." };
  }

  // ✅ If accepted, create message session
  if (response === "accepted" && request.initiatee_id === user.id) {
    console.log("✅ Creating message session for accepted request");

    const { error: sessionError } = await supabase
      .from("message_sessions")
      .insert({
        place_id: request.place_id,
        initiator_id: request.initiator_id,
        initiatee_id: request.initiatee_id,
        status: "accepted",
      });

    if (sessionError) {
      console.error("❌ Failed to create session:", sessionError);
      return { message: "Failed to create messaging session." };
    }
  }

  // ✅ Update request status (RLS ensures we can only update our requests)
  const { error: updateError } = await supabase
    .from("message_session_requests")
    .update({ status: response })
    .eq("id", requestId);

  if (updateError) {
    console.error("❌ Failed to update request:", updateError);
    return { message: "Failed to update request." };
  }

  console.log(`✅ Request ${response}:`, requestId);
  return { message: `Request ${response}.` };
}

// ============================================
// GET MESSAGE SESSION (UPDATED)
// ============================================

export async function getMessageSession({
  userId,
  placeId,
}: {
  userId: string;
  placeId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("❌ Not authenticated");
    return null;
  }

  // ✅ Verify userId matches authenticated user
  if (user.id !== userId) {
    console.error("❌ Unauthorized: userId doesn't match authenticated user");
    return null;
  }

  const twoHoursAgo = subHours(new Date(), 2);

  // ✅ Query using Supabase (RLS automatically filters to user's sessions)
  const { data: session, error } = await supabase
    .from("message_sessions")
    .select("*")
    .eq("place_id", placeId)
    .or(`initiator_id.eq.${userId},initiatee_id.eq.${userId}`)
    .gte("created_at", twoHoursAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ Error fetching session:", error);
    return null;
  }

  if (session) {
    console.log("✅ Found active session:", session.id);
  } else {
    console.log("ℹ️ No active session found");
  }

  return session;
}

// ============================================
// SUBMIT MESSAGE (UPDATED)
// ============================================

import type { InferSelectModel } from "drizzle-orm";

type MessageRow = InferSelectModel<typeof messagesTable>;

export async function submitMessage(
  prev: { ok: boolean; newMessage: MessageRow | null; error: string },
  formData: FormData,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Not authenticated");
      return { ok: false, newMessage: null, error: "Not authenticated" };
    }

    const sessionId = formData.get("sessionId") as string;
    const senderCheckinId = Number(formData.get("senderCheckinId"));
    const content = (formData.get("content") as string).trim();

    if (!content) {
      return { ok: false, newMessage: null, error: "Message cannot be empty" };
    }

    if (!sessionId || !senderCheckinId) {
      return {
        ok: false,
        newMessage: null,
        error: "Missing session or checkin ID",
      };
    }

    // ✅ Verify the sender_checkin belongs to the authenticated user
    const { data: checkin, error: checkinError } = await supabase
      .from("checkins")
      .select("user_id")
      .eq("id", senderCheckinId)
      .single();

    if (checkinError || !checkin || checkin.user_id !== user.id) {
      console.error("❌ Invalid or unauthorized sender checkin:", checkinError);
      return { ok: false, newMessage: null, error: "Invalid sender" };
    }

    // ✅ Verify user is part of the session (RLS will also enforce this)
    const { data: session, error: sessionError } = await supabase
      .from("message_sessions")
      .select("initiator_id, initiatee_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return { ok: false, newMessage: null, error: "Session not found" };
    }

    if (session.initiator_id !== user.id && session.initiatee_id !== user.id) {
      console.error("❌ User not part of session");
      return {
        ok: false,
        newMessage: null,
        error: "Not authorized for this session",
      };
    }

    // ✅ Insert message using Supabase (RLS ensures sender is part of session)
    const { data: newMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        sender_checkin_id: senderCheckinId,
        content: content,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to insert message:", insertError);
      return { ok: false, newMessage: null, error: insertError.message };
    }

    console.log("✅ Message sent:", newMessage.id);

    // Convert timestamp to Date object for compatibility
    const messageWithDate = {
      ...newMessage,
      createdAt: new Date(newMessage.created_at),
    };

    return {
      ok: true,
      newMessage: messageWithDate as unknown as MessageRow,
      error: "",
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ submitMessage failed:", error);
    return { ok: false, newMessage: null, error: error.message };
  }
}

// ============================================
// ADDITIONAL HELPER FUNCTIONS
// ============================================

// ✅ NEW: Get all message requests for a user
export async function getMessageRequests(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== userId) {
    return [];
  }

  const twoHoursAgo = subHours(new Date(), 2);

  const { data, error } = await supabase
    .from("message_session_requests")
    .select("*")
    .or(`initiator_id.eq.${userId},initiatee_id.eq.${userId}`)
    .gte("created_at", twoHoursAgo.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching requests:", error);
    return [];
  }

  return data || [];
}

// ✅ NEW: Cancel a pending request
export async function cancelMessageRequest(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  // ✅ RLS will ensure we can only cancel our own requests
  const { error } = await supabase
    .from("message_session_requests")
    .update({ status: "canceled" })
    .eq("id", requestId)
    .eq("initiator_id", user.id) // Only initiator can cancel
    .eq("status", "pending"); // Can only cancel pending requests

  if (error) {
    console.error("❌ Failed to cancel request:", error);
    return { success: false, error: error.message };
  }

  console.log("✅ Request canceled:", requestId);
  return { success: true };
}

// ✅ NEW: Get messages for a session
export async function getSessionMessages(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  // ✅ RLS will automatically filter to only sessions we're part of
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ Error fetching messages:", error);
    return [];
  }

  return data || [];
}

// ✅ NEW: Check if user has permission to access a session
export async function verifySessionAccess(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("message_sessions")
    .select("initiator_id, initiatee_id")
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.initiator_id === userId || data.initiatee_id === userId;
}

// src/app/_actions/messageActions.ts
"use server";

import { messagesTable } from "@/lib/schema";

import { createClient } from "@/utils/supabase/server";
import { subHours } from "date-fns";

import {
  messageSchema,
  messageRequestSchema,
  respondToRequestSchema,
} from "@/lib/validators/message";
import { sanitizeText } from "@/lib/validators/common";
import {
  checkServerActionRateLimit,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/serverActionRateLimit";

// ============================================
// REQUEST TO MESSAGE (UPDATED)
// ============================================

// src/app/_actions/messageActions.ts (ADD MORE DETAILED LOGGING)
export async function requestToMessage(input: {
  initiatorId: string;
  initiateeId: string;
  placeId: string;
}) {
  const startTime = Date.now();
  console.log("🚀 requestToMessage started:", startTime);

  try {
    // Rate limiting check
    const rateLimitStart = Date.now();
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.messageRequest,
    );
    console.log(`⏱️ Rate limit check took: ${Date.now() - rateLimitStart}ms`);

    if (!rateLimitResult.success) {
      console.error("❌ Rate limit exceeded");
      return { success: false, error: rateLimitResult.error };
    }

    // Auth check
    const authStart = Date.now();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log(`⏱️ Auth check took: ${Date.now() - authStart}ms`);

    if (authError || !user) {
      console.error("❌ Not authenticated", authError);
      return { success: false, error: "Not authenticated" };
    }

    // Validation
    const validationStart = Date.now();
    const validated = messageRequestSchema.parse(input);
    console.log(`⏱️ Validation took: ${Date.now() - validationStart}ms`);

    // Verify initiatorId matches authenticated user
    if (user.id !== validated.initiatorId) {
      console.error("❌ Unauthorized: initiator doesn't match user");
      return { success: false, error: "Unauthorized" };
    }

    // Location check
    const locationStart = Date.now();
    console.log("🔍 Starting location check...");

    try {
      const { data: samePlace, error: checkError } = await supabase.rpc(
        "are_users_at_same_place",
        {
          user1_id: validated.initiatorId,
          user2_id: validated.initiateeId,
        },
      );
      console.log(`⏱️ Location check took: ${Date.now() - locationStart}ms`);
      console.log("🔍 Location check result:", { samePlace, checkError });

      if (checkError) {
        console.error("❌ Location check error:", checkError);
        return { success: false, error: "Location verification failed" };
      }

      if (!samePlace) {
        console.error("❌ Users not at same place");
        return {
          success: false,
          error: "Both users must be at the same location",
        };
      }
    } catch (locationError) {
      console.error("❌ Location check threw error:", locationError);
      return { success: false, error: "Location verification failed" };
    }

    // Check existing requests
    const existingStart = Date.now();
    console.log("🔍 Checking for existing requests...");

    try {
      const { data: existingRequests, error: existingError } = await supabase
        .from("message_session_requests")
        .select("*")
        .eq("initiator_id", validated.initiatorId)
        .eq("initiatee_id", validated.initiateeId)
        .eq("place_id", validated.placeId)
        .in("status", ["pending", "accepted"]);

      console.log(
        `⏱️ Existing requests check took: ${Date.now() - existingStart}ms`,
      );
      console.log("🔍 Existing requests result:", {
        existingRequests,
        existingError,
      });

      if (existingError) {
        console.error("❌ Error checking existing requests:", existingError);
        return { success: false, error: "Failed to check existing requests" };
      }

      if (existingRequests && existingRequests.length > 0) {
        console.warn("⚠️ Duplicate request found:", existingRequests[0]);
        return { success: false, error: "Request already exists" };
      }
    } catch (existingCheckError) {
      console.error(
        "❌ Existing requests check threw error:",
        existingCheckError,
      );
      return { success: false, error: "Failed to check existing requests" };
    }

    // Insert new request
    const insertStart = Date.now();
    console.log("🔍 Inserting new request...");

    try {
      const { data: newRequest, error: insertError } = await supabase
        .from("message_session_requests")
        .insert({
          initiator_id: validated.initiatorId,
          initiatee_id: validated.initiateeId,
          place_id: validated.placeId,
          status: "pending",
        })
        .select()
        .single();

      console.log(`⏱️ Insert took: ${Date.now() - insertStart}ms`);
      console.log("🔍 Insert result:", { newRequest, insertError });

      if (insertError) {
        console.error("❌ Failed to create request:", insertError);
        return {
          success: false,
          error: `Failed to create request: ${insertError.message}`,
        };
      }

      const totalTime = Date.now() - startTime;
      console.log(
        `✅ requestToMessage completed successfully in: ${totalTime}ms`,
      );

      return { success: true, data: newRequest };
    } catch (insertThrownError) {
      console.error("❌ Insert threw error:", insertThrownError);
      return { success: false, error: "Failed to create request" };
    }
  } catch (e: unknown) {
    const totalTime = Date.now() - startTime;
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error(`❌ requestToMessage failed after ${totalTime}ms:`, error);
    console.error("❌ Full error details:", e);
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
  // ✅ Rate limiting check FIRST
  const rateLimitResult = await checkServerActionRateLimit(
    RATE_LIMIT_CONFIGS.respondToRequest,
  );

  if (!rateLimitResult.success) {
    console.error("❌ Rate limit exceeded for responding to request");
    return {
      message: rateLimitResult.error || "Too many responses. Please slow down.",
    };
  }

  const validated = respondToRequestSchema.parse({
    requestId: formData.get("requestId"),
    response: formData.get("response"),
  });

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
    .eq("id", validated.requestId)
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
  if (validated.response === "accepted" && request.initiatee_id === user.id) {
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
    .update({ status: validated.response })
    .eq("id", validated.requestId);

  if (updateError) {
    console.error("❌ Failed to update request:", updateError);
    return { message: "Failed to update request." };
  }

  console.log(`✅ Request ${validated.response}:`, validated.requestId);
  return { message: `Request ${validated.response}.` };
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
    // ✅ Rate limiting check FIRST
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.sendMessage,
    );

    if (!rateLimitResult.success) {
      console.error("❌ Rate limit exceeded for sending message");
      return {
        ok: false,
        newMessage: null,
        error:
          rateLimitResult.error ||
          "Sending messages too quickly. Please slow down.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Not authenticated");
      return { ok: false, newMessage: null, error: "Not authenticated" };
    }

    const rawData = {
      sessionId: formData.get("sessionId"),
      senderCheckinId: formData.get("senderCheckinId"),
      content: formData.get("content"),
    };

    const validated = messageSchema.parse({
      sessionId: rawData.sessionId,
      senderCheckinId: Number(rawData.senderCheckinId),
      content: sanitizeText(rawData.content as string),
    });

    const sessionId = formData.get("sessionId") as string;
    const senderCheckinId = Number(formData.get("senderCheckinId"));
    const content = validated.content;

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
    console.log(`✅ Rate limit remaining: ${rateLimitResult.remaining}`);

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

// src/app/_actions/messageActions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { subHours } from "date-fns";

// ✅ Import domain entity types
import {
  // Domain entity types
  type Message,
  type MessageRequest,
  type MessageSession,

  // Branded types
  type UserId,
  type PlaceId,
  type SessionId,
  type RequestId,
  type MessageRequestStatus,

  // Validation schemas
  userIdSchema,
  placeIdSchema,
  checkinIdSchema,
  sessionIdSchema,
  requestIdSchema,
  messageIdSchema,
  timestampSchema,
  sanitizedContentSchema,
  messageRequestStatusSchema,
  messageSessionStatusSchema,
  sendMessageFormSchema,
  respondToRequestFormSchema,

  // Status constants
  MESSAGE_REQUEST_STATUS,
  MESSAGE_SESSION_STATUS,
} from "@/lib/types/database";

import {
  checkServerActionRateLimit,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/serverActionRateLimit";

// ============================================
// ACTION INPUT/OUTPUT TYPES
// ============================================

// Request to Message
export type RequestToMessageInput = {
  initiatorId: UserId;
  initiateeId: UserId;
  placeId: PlaceId;
};

export type RequestToMessageResult = {
  success: boolean;
  error?: string;
  data?: {
    requestId: RequestId;
    status: MessageRequestStatus;
  };
};

// Submit Message
export type SubmitMessageResult = {
  ok: boolean;
  newMessage: Message | null;
  error: string;
};

// Generic action result
export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// ============================================
// REQUEST TO MESSAGE
// ============================================

export async function requestToMessage(
  input: RequestToMessageInput,
): Promise<RequestToMessageResult> {
  try {
    // Rate limiting
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.messageRequest,
    );

    if (!rateLimitResult.success) {
      console.error("❌ Rate limit exceeded for message request");
      return { success: false, error: rateLimitResult.error };
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Not authenticated");
      return { success: false, error: "Not authenticated" };
    }

    const authenticatedUserId = userIdSchema.parse(user.id);

    // Verify initiator matches authenticated user
    if (authenticatedUserId !== input.initiatorId) {
      console.error("❌ Unauthorized: initiator doesn't match user");
      return { success: false, error: "Unauthorized" };
    }

    // Location verification
    const { data: samePlace, error: checkError } = await supabase.rpc(
      "are_users_at_same_place",
      {
        user1_id: input.initiatorId,
        user2_id: input.initiateeId,
      },
    );

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

    // Check for existing requests
    const { data: existingRequests, error: existingError } = await supabase
      .from("message_session_requests")
      .select("*")
      .eq("initiator_id", input.initiatorId)
      .eq("initiatee_id", input.initiateeId)
      .eq("place_id", input.placeId)
      .in("status", ["pending", "accepted"]);

    if (existingError) {
      console.error("❌ Error checking existing requests:", existingError);
      return { success: false, error: "Failed to check existing requests" };
    }

    if (existingRequests && existingRequests.length > 0) {
      return { success: false, error: "Request already exists" };
    }

    // Insert new request
    const { data: newRequest, error: insertError } = await supabase
      .from("message_session_requests")
      .insert({
        initiator_id: input.initiatorId,
        initiatee_id: input.initiateeId,
        place_id: input.placeId,
        status: MESSAGE_REQUEST_STATUS.PENDING,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to create request:", insertError);
      return {
        success: false,
        error: `Failed to create request: ${insertError.message}`,
      };
    }

    // Parse response as domain types
    const requestId = requestIdSchema.parse(newRequest.id);
    const status = messageRequestStatusSchema.parse(newRequest.status);

    console.log("✅ Message request created:", requestId);

    return {
      success: true,
      data: { requestId, status },
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ requestToMessage failed:", error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// RESPOND TO MESSAGE REQUEST
// ============================================

export async function respondToMessageRequest(
  prevState: { message: string },
  formData: FormData,
): Promise<{ message: string }> {
  try {
    // Rate limiting
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.respondToRequest,
    );

    if (!rateLimitResult.success) {
      console.error("❌ Rate limit exceeded for responding to request");
      return {
        message:
          rateLimitResult.error || "Too many responses. Please slow down.",
      };
    }

    // Parse and validate form data
    const validated = respondToRequestFormSchema.parse({
      requestId: formData.get("requestId"),
      response: formData.get("response"),
    });

    const requestId = requestIdSchema.parse(validated.requestId);
    const response = messageRequestStatusSchema.parse(validated.response);

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Not authenticated");
      return { message: "Not authenticated." };
    }

    const userId = userIdSchema.parse(user.id);

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from("message_session_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      console.error("❌ Request not found or unauthorized:", fetchError);
      return { message: "Request not found." };
    }

    // Verify user is part of request
    if (request.initiator_id !== userId && request.initiatee_id !== userId) {
      console.error("❌ Unauthorized to respond to this request");
      return { message: "Unauthorized." };
    }

    // If accepted, create message session
    if (
      response === MESSAGE_REQUEST_STATUS.ACCEPTED &&
      request.initiatee_id === userId
    ) {
      const { error: sessionError } = await supabase
        .from("message_sessions")
        .insert({
          place_id: request.place_id,
          initiator_id: request.initiator_id,
          initiatee_id: request.initiatee_id,
          source_request_id: requestId,
          status: MESSAGE_SESSION_STATUS.ACTIVE,
        });

      if (sessionError) {
        console.error("❌ Failed to create session:", sessionError);
        return { message: "Failed to create messaging session." };
      }

      console.log("✅ Message session created for request:", requestId);
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("message_session_requests")
      .update({
        status: response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("❌ Failed to update request:", updateError);
      return { message: "Failed to update request." };
    }

    console.log(`✅ Request ${response}:`, requestId);
    return { message: `Request ${response}.` };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ respondToMessageRequest failed:", error.message);
    return { message: error.message };
  }
}

// ============================================
// GET MESSAGE SESSION
// ============================================

export async function getMessageSession(input: {
  userId: UserId;
  placeId: PlaceId;
}): Promise<MessageSession | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Not authenticated");
      return null;
    }

    const authenticatedUserId = userIdSchema.parse(user.id);

    // Verify userId matches authenticated user
    if (authenticatedUserId !== input.userId) {
      console.error("❌ Unauthorized: userId doesn't match authenticated user");
      return null;
    }

    const twoHoursAgo = subHours(new Date(), 2);

    const { data: session, error } = await supabase
      .from("message_sessions")
      .select("*")
      .eq("place_id", input.placeId)
      .or(`initiator_id.eq.${input.userId},initiatee_id.eq.${input.userId}`)
      .gte("created_at", twoHoursAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching session:", error);
      return null;
    }

    if (!session) return null;

    // Parse as domain type with correct schemas
    return {
      id: sessionIdSchema.parse(session.id),
      placeId: placeIdSchema.parse(session.place_id),
      initiatorId: userIdSchema.parse(session.initiator_id),
      initiateeId: userIdSchema.parse(session.initiatee_id),
      sourceRequestId: session.source_request_id
        ? requestIdSchema.parse(session.source_request_id)
        : undefined,
      createdAt: timestampSchema.parse(new Date(session.created_at)),
      status: messageSessionStatusSchema.parse(session.status),
      expiresAt: session.expires_at
        ? timestampSchema.parse(new Date(session.expires_at))
        : undefined,
      closedAt: session.closed_at
        ? timestampSchema.parse(new Date(session.closed_at))
        : undefined,
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ getMessageSession failed:", error.message);
    return null;
  }
}

// ============================================
// SUBMIT MESSAGE
// ============================================

export async function submitMessage(
  prev: SubmitMessageResult,
  formData: FormData,
): Promise<SubmitMessageResult> {
  try {
    // Rate limiting
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

    const userId = userIdSchema.parse(user.id);

    // Parse and validate
    const validated = sendMessageFormSchema.parse({
      sessionId: formData.get("sessionId"),
      senderCheckinId: formData.get("senderCheckinId"),
      content: formData.get("content"),
    });

    const sessionId = sessionIdSchema.parse(validated.sessionId);
    const senderCheckinId = checkinIdSchema.parse(validated.senderCheckinId);

    // Verify sender checkin belongs to authenticated user
    const { data: checkin, error: checkinError } = await supabase
      .from("checkins")
      .select("user_id")
      .eq("id", senderCheckinId)
      .single();

    if (checkinError || !checkin || checkin.user_id !== userId) {
      console.error("❌ Invalid or unauthorized sender checkin");
      return { ok: false, newMessage: null, error: "Invalid sender" };
    }

    // Verify user is part of the session
    const { data: session, error: sessionError } = await supabase
      .from("message_sessions")
      .select("initiator_id, initiatee_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found");
      return { ok: false, newMessage: null, error: "Session not found" };
    }

    if (session.initiator_id !== userId && session.initiatee_id !== userId) {
      console.error("❌ User not part of session");
      return {
        ok: false,
        newMessage: null,
        error: "Not authorized for this session",
      };
    }

    // Insert message
    const { data: newMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        sender_checkin_id: senderCheckinId,
        content: validated.content,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to insert message:", insertError);
      return { ok: false, newMessage: null, error: insertError.message };
    }

    const messageId = messageIdSchema.parse(newMessage.id);
    console.log("✅ Message sent:", messageId);

    // Return as domain type with all fields properly branded
    const message: Message = {
      id: messageId,
      sessionId,
      senderCheckinId,
      content: sanitizedContentSchema.parse(validated.content),
      createdAt: timestampSchema.parse(new Date(newMessage.created_at)),
      deliveredAt: newMessage.delivered_at
        ? timestampSchema.parse(new Date(newMessage.delivered_at))
        : undefined,
      readAt: newMessage.read_at
        ? timestampSchema.parse(new Date(newMessage.read_at))
        : undefined,
    };

    return {
      ok: true,
      newMessage: message,
      error: "",
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ submitMessage failed:", error.message);
    return { ok: false, newMessage: null, error: error.message };
  }
}

// ============================================
// GET MESSAGE REQUESTS
// ============================================

export async function getMessageRequests(
  userId: UserId,
): Promise<MessageRequest[]> {
  try {
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

    // Map to domain types with all fields properly parsed
    return (data || []).map((req) => ({
      id: requestIdSchema.parse(req.id),
      initiatorId: userIdSchema.parse(req.initiator_id),
      initiateeId: userIdSchema.parse(req.initiatee_id),
      placeId: placeIdSchema.parse(req.place_id),
      status: messageRequestStatusSchema.parse(req.status),
      createdAt: timestampSchema.parse(new Date(req.created_at)),
      respondedAt: req.responded_at
        ? timestampSchema.parse(new Date(req.responded_at))
        : undefined,
    }));
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ getMessageRequests failed:", error.message);
    return [];
  }
}

// ============================================
// CANCEL MESSAGE REQUEST
// ============================================

export async function cancelMessageRequest(
  requestId: RequestId,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = userIdSchema.parse(user.id);

    const { error } = await supabase
      .from("message_session_requests")
      .update({ status: MESSAGE_REQUEST_STATUS.CANCELED })
      .eq("id", requestId)
      .eq("initiator_id", userId)
      .eq("status", MESSAGE_REQUEST_STATUS.PENDING);

    if (error) {
      console.error("❌ Failed to cancel request:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Request canceled:", requestId);
    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ cancelMessageRequest failed:", error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// GET SESSION MESSAGES
// ============================================

export async function getSessionMessages(
  sessionId: SessionId,
): Promise<Message[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Error fetching messages:", error);
      return [];
    }

    // Map to domain types with all fields properly parsed
    return (data || []).map((msg) => ({
      id: messageIdSchema.parse(msg.id),
      sessionId: sessionIdSchema.parse(msg.session_id),
      senderCheckinId: checkinIdSchema.parse(msg.sender_checkin_id),
      content: sanitizedContentSchema.parse(msg.content),
      createdAt: timestampSchema.parse(new Date(msg.created_at)),
      deliveredAt: msg.delivered_at
        ? timestampSchema.parse(new Date(msg.delivered_at))
        : undefined,
      readAt: msg.read_at
        ? timestampSchema.parse(new Date(msg.read_at))
        : undefined,
    }));
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ getSessionMessages failed:", error.message);
    return [];
  }
}

// ============================================
// VERIFY SESSION ACCESS
// ============================================

export async function verifySessionAccess(
  sessionId: SessionId,
  userId: UserId,
): Promise<boolean> {
  try {
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
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ verifySessionAccess failed:", error.message);
    return false;
  }
}

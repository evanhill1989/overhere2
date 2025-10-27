// src/app/_actions/messageActions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { subHours } from "date-fns";

// ============================================
// IMPORT FROM TYPE SYSTEM (NOT local definitions)
// ============================================

// Domain entity types & branded primitives
import {
  type Message,
  type MessageRequest,
  type MessageSession,
  type UserId,
  type PlaceId,
  type SessionId,
  type RequestId,
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
  MESSAGE_REQUEST_STATUS,
  MESSAGE_SESSION_STATUS,
  DatabaseMessageSession,
} from "@/lib/types/database";

// API contracts (request/response types)
import {
  CreateMessageRequestRequest,
  CreateMessageRequestResponse,
  SendMessageResponse,
  ApiResponse,
} from "@/lib/types/api";

// Security
import {
  checkServerActionRateLimit,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/serverActionRateLimit";

// ============================================
// REQUEST TO MESSAGE
// ============================================

export async function requestToMessage(
  input: CreateMessageRequestRequest,
): Promise<CreateMessageRequestResponse> {
  console.log("USERA requesting a messagesessi @@@@@@@@@@@@@@@@");
  try {
    // Rate limiting
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.messageRequest,
    );

    if (!rateLimitResult.success) {
      console.error("❌ Rate limit exceeded for message request");
      return {
        success: false,
        error: rateLimitResult.error || "Rate limit exceeded",
      };
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

    // Validate & brand primitives
    const authenticatedUserId = userIdSchema.parse(user.id);
    const initiatorId = userIdSchema.parse(input.initiatorId);
    const initiateeId = userIdSchema.parse(input.initiateeId);
    const placeId = placeIdSchema.parse(input.placeId);

    // Verify initiator matches authenticated user
    if (authenticatedUserId !== initiatorId) {
      console.error("❌ Unauthorized: initiator doesn't match user");
      return { success: false, error: "Unauthorized" };
    }

    // Location verification
    const { data: samePlace, error: checkError } = await supabase.rpc(
      "are_users_at_same_place",
      {
        user1_id: initiatorId,
        user2_id: initiateeId,
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
      .eq("initiator_id", initiatorId)
      .eq("initiatee_id", initiateeId)
      .eq("place_id", placeId)
      .in("status", ["pending", "accepted"]);

    if (existingError) {
      console.error("❌ Error checking existing requests:", existingError);
      return { success: false, error: "Failed to check existing requests" };
    }

    if (existingRequests && existingRequests.length > 0) {
      return { success: false, error: "Request already exists" };
    }

    console.log("[USERA INSERT]", new Date().toISOString());

    // Insert new request
    const { data: newRequest, error: insertError } = await supabase
      .from("message_session_requests")
      .insert({
        initiator_id: initiatorId,
        initiatee_id: initiateeId,
        place_id: placeId,
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
): Promise<{ message: string; newSession?: DatabaseMessageSession }> {
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

    const validated = respondToRequestFormSchema.parse({
      requestId: formData.get("requestId"),
      response: formData.get("response"),
    });

    const requestId = requestIdSchema.parse(validated.requestId);
    const response = messageRequestStatusSchema.parse(validated.response); // Auth check

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Not authenticated");
      return { message: "Not authenticated." };
    }

    const userId = userIdSchema.parse(user.id); // Get the request

    const { data: request, error: fetchError } = await supabase
      .from("message_session_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      console.error("❌ Request not found or unauthorized:", fetchError);
      return { message: "Request not found." };
    } // Verify user is part of request

    if (request.initiator_id !== userId && request.initiatee_id !== userId) {
      console.error("❌ Unauthorized to respond to this request");
      return { message: "Unauthorized." };
    }

    // 💡 Initialize variable for the new session data
    let newSession: DatabaseMessageSession | undefined; // If accepted, create message session

    if (
      response === MESSAGE_REQUEST_STATUS.ACCEPTED &&
      request.initiatee_id === userId
    ) {
      const { data: sessionData, error: sessionError } = await supabase
        .from("message_sessions")
        .insert({
          place_id: request.place_id,
          initiator_id: request.initiator_id,
          initiatee_id: request.initiatee_id,
          source_request_id: requestId,
          status: MESSAGE_SESSION_STATUS.ACTIVE,
        })
        .select("*")
        .single();

      if (sessionError || !sessionData) {
        // Check for sessionData
        console.error("❌ Failed to create session:", sessionError);
        return { message: "Failed to create messaging session." };
      }

      newSession = sessionData as DatabaseMessageSession; // 💡 Store the new session data

      console.log("✅ Message session created for request:", requestId);
    } // Update request status

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
    return {
      message: `Request ${response}.`,
      newSession: newSession, // 💡 RETURN THE NEW SESSION DATA
    };
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
  prev: SendMessageResponse,
  formData: FormData,
): Promise<SendMessageResponse> {
  try {
    // Rate limiting
    const rateLimitResult = await checkServerActionRateLimit(
      RATE_LIMIT_CONFIGS.sendMessage,
    );

    if (!rateLimitResult.success) {
      console.error("❌ Rate limit exceeded for sending message");
      return {
        success: false,
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
      return { success: false, error: "Not authenticated" };
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
      return { success: false, error: "Invalid sender" };
    }

    // Verify user is part of the session
    const { data: session, error: sessionError } = await supabase
      .from("message_sessions")
      .select("initiator_id, initiatee_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found");
      return { success: false, error: "Session not found" };
    }

    if (session.initiator_id !== userId && session.initiatee_id !== userId) {
      console.error("❌ User not part of session");
      return {
        success: false,
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
      return { success: false, error: insertError.message };
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
      success: true,
      data: {
        messageId,
        message,
      },
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    console.error("❌ submitMessage failed:", error.message);
    return { success: false, error: error.message };
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
): Promise<ApiResponse<void>> {
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
    return { success: true, data: undefined };
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

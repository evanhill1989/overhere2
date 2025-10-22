// src/hooks/useRealtimeMessageSession.ts
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subHours } from "date-fns";

import type { MessageSession, UserId, PlaceId } from "@/lib/types/database";
import {
  sessionIdSchema,
  userIdSchema,
  placeIdSchema,
  messageSessionStatusSchema,
  timestampSchema,
  requestIdSchema,
} from "@/lib/types/database";

// ============================================
// DATABASE TYPE (snake_case from Supabase)
// ============================================

type DatabaseMessageSession = {
  id: string;
  place_id: string;
  initiator_id: string;
  initiatee_id: string;
  source_request_id: string | null;
  created_at: string;
  status: "active" | "expired";
  expires_at: string | null;
  closed_at: string | null;
};

// ============================================
// TYPE CONVERTER
// ============================================

function mapSessionToCamel(raw: DatabaseMessageSession): MessageSession {
  return {
    id: sessionIdSchema.parse(raw.id),
    placeId: placeIdSchema.parse(raw.place_id),
    initiatorId: userIdSchema.parse(raw.initiator_id),
    initiateeId: userIdSchema.parse(raw.initiatee_id),
    sourceRequestId: raw.source_request_id
      ? requestIdSchema.parse(raw.source_request_id)
      : undefined,
    createdAt: timestampSchema.parse(new Date(raw.created_at)),
    status: messageSessionStatusSchema.parse(raw.status),
    expiresAt: raw.expires_at
      ? timestampSchema.parse(new Date(raw.expires_at))
      : undefined,
    closedAt: raw.closed_at
      ? timestampSchema.parse(new Date(raw.closed_at))
      : undefined,
  };
}

// ============================================
// FETCH FUNCTION
// ============================================

async function fetchMessageSession(
  userId: UserId,
  placeId: PlaceId,
): Promise<MessageSession | null> {
  const supabase = createClient();
  const twoHoursAgo = subHours(new Date(), 2);

  const { data, error } = await supabase
    .from("message_sessions")
    .select("*")
    .eq("place_id", placeId)
    .or(`initiator_id.eq.${userId},initiatee_id.eq.${userId}`)
    .gte("created_at", twoHoursAgo.toISOString())
    .eq("status", "active") // ✅ Only fetch active sessions
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ Error fetching message session:", error);
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  if (!data) {
    console.log("📭 No active session found");
    return null;
  }

  console.log("✅ Active session found:", data.id);
  return mapSessionToCamel(data);
}

// ============================================
// MAIN HOOK
// ============================================

export function useRealtimeMessageSession(
  userId: UserId | null,
  placeId: PlaceId | null,
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<MessageSession | null, Error>({
    queryKey: ["messageSession", userId, placeId],
    queryFn: () => fetchMessageSession(userId!, placeId!),
    enabled: !!userId && !!placeId,
    staleTime: 30000, // 30 seconds
    refetchInterval: false, // ✅ DISABLE POLLING
    refetchOnWindowFocus: false, // ✅ DISABLE
    refetchOnMount: false, // ✅ Only fetch once
  });

  // 2. Real-time subscription
  useEffect(() => {
    if (!userId || !placeId) return;

    const supabase = createClient();

    console.log(
      "⏱️ Realtime session subscription started for",
      placeId,
      userId,
    );

    // Clean up existing channel
    if (channelRef.current) {
      console.log("🧹 Cleaning up existing session channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`message-session-${placeId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_sessions",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          console.log("🔔 New session created via real-time");

          try {
            const rawSession = payload.new as DatabaseMessageSession;

            // Only process if this user is part of the session
            if (
              rawSession.initiator_id === userId ||
              rawSession.initiatee_id === userId
            ) {
              const newSession = mapSessionToCamel(rawSession);

              queryClient.setQueryData<MessageSession | null>(
                ["messageSession", userId, placeId],
                newSession,
              );

              console.log("✅ Session cache updated:", newSession.id);
            }
          } catch (error) {
            console.error("❌ Error processing session INSERT:", error);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_sessions",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          console.log("🔔 Session updated via real-time");

          try {
            const rawSession = payload.new as DatabaseMessageSession;

            // Only process if this user is part of the session
            if (
              rawSession.initiator_id === userId ||
              rawSession.initiatee_id === userId
            ) {
              const updatedSession = mapSessionToCamel(rawSession);

              queryClient.setQueryData<MessageSession | null>(
                ["messageSession", userId, placeId],
                updatedSession,
              );

              console.log("✅ Session status updated:", updatedSession.status);

              // If session expired, could show a notification
              if (updatedSession.status === "expired") {
                console.log("⏱️ Session expired");
              }
            }
          } catch (error) {
            console.error("❌ Error processing session UPDATE:", error);
          }
        },
      )
      .subscribe(async (status) => {
        console.log(" 📡📡📡📡📡 Channel status:", status);

        if (status === "SUBSCRIBED") {
          await new Promise((r) => setTimeout(r, 550));
          // FIX 1: Force a refetch of the session data.
          queryClient.refetchQueries({
            queryKey: ["messageSession", userId, placeId],
          });

          queryClient.refetchQueries({
            queryKey: ["messageRequests", userId, placeId],
          });
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Message session subscription error");
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Message session subscription timed out");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log("🔌 Unsubscribing from message session");
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, placeId, queryClient]);

  return query;
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Check if user has an active session at any place
 */
export function useHasActiveSession(userId: UserId | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["hasActiveSession", userId],
    queryFn: async () => {
      if (!userId) return false;

      const twoHoursAgo = subHours(new Date(), 2);

      const { data, error } = await supabase
        .from("message_sessions")
        .select("id")
        .or(`initiator_id.eq.${userId},initiatee_id.eq.${userId}`)
        .gte("created_at", twoHoursAgo.toISOString())
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      console.error(error);
      return !!data;
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get the other user's ID in a session
 */
export function getOtherUserId(
  session: MessageSession,
  currentUserId: UserId,
): UserId {
  return session.initiatorId === currentUserId
    ? session.initiateeId
    : session.initiatorId;
}

/**
 * Check if session is about to expire (within 10 minutes)
 */
export function isSessionExpiringSoon(session: MessageSession): boolean {
  if (!session.expiresAt) return false;

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  const tenMinutes = 10 * 60 * 1000;

  return expiresAt.getTime() - now.getTime() < tenMinutes;
}

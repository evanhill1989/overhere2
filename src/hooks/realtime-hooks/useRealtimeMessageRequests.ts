// src/hooks/useRealtimeMessageRequests.ts (SIMPLIFIED)
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { subHours } from "date-fns";

import type { MessageRequest, UserId, PlaceId } from "@/lib/types/database";
import {
  requestIdSchema,
  userIdSchema,
  placeIdSchema,
  messageRequestStatusSchema,
  timestampSchema,
} from "@/lib/types/database";

type DatabaseMessageRequest = {
  id: string;
  initiator_id: string;
  initiatee_id: string;
  place_id: string;
  status: "pending" | "accepted" | "rejected" | "canceled" | "expired";
  created_at: string;
  responded_at: string | null;
};

function mapRequestToCamel(raw: DatabaseMessageRequest): MessageRequest {
  return {
    id: requestIdSchema.parse(raw.id),
    initiatorId: userIdSchema.parse(raw.initiator_id),
    initiateeId: userIdSchema.parse(raw.initiatee_id),
    placeId: placeIdSchema.parse(raw.place_id),
    status: messageRequestStatusSchema.parse(raw.status),
    createdAt: timestampSchema.parse(new Date(raw.created_at)),
    respondedAt: raw.responded_at
      ? timestampSchema.parse(new Date(raw.responded_at))
      : undefined,
  };
}

async function fetchMessageRequests(
  userId: UserId,
  placeId: PlaceId,
): Promise<MessageRequest[]> {
  const supabase = createClient();
  const twoHoursAgo = subHours(new Date(), 2);

  const { data, error } = await supabase
    .from("message_session_requests")
    .select("*")
    .eq("place_id", placeId) // ✅ Filter by place first
    .or(`initiator_id.eq.${userId},initiatee_id.eq.${userId}`)
    .gte("created_at", twoHoursAgo.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching message requests:", error);
    throw new Error(`Failed to fetch requests: ${error.message}`);
  }

  return (data || []).map(mapRequestToCamel);
}

export function useRealtimeMessageRequests(
  userId: UserId | null,
  placeId: PlaceId | null,
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ============================================
  // 1. FETCH WITH REACT QUERY (No polling!)
  // ============================================
  const query = useQuery<MessageRequest[], Error>({
    queryKey: ["messageRequests", userId, placeId],
    queryFn: () => fetchMessageRequests(userId!, placeId!),
    enabled: !!userId && !!placeId,
    staleTime: 30000, // 30 seconds
    refetchInterval: false, // ✅ DISABLE POLLING - real-time handles updates
    refetchOnWindowFocus: false, // ✅ DISABLE - real-time handles updates
    refetchOnMount: false, // ✅ DISABLE - only fetch once on mount
  });

  // ============================================
  // 2. REAL-TIME SUBSCRIPTION
  // ============================================
  useEffect(() => {
    if (!userId || !placeId) return;

    const supabase = createClient();

    // Clean up existing channel
    if (channelRef.current) {
      console.log("🧹 Cleaning up existing requests channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log("📡 Setting up real-time for message requests");

    const channel = supabase
      .channel(`message-requests-${placeId}-${userId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_session_requests",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          console.log(
            "🔔 Real-time message request update:",
            payload.eventType,
          );

          queryClient.setQueryData<MessageRequest[]>(
            ["messageRequests", userId, placeId],
            (oldData = []) => {
              try {
                if (payload.eventType === "INSERT") {
                  const newReq = payload.new as DatabaseMessageRequest;

                  // Only process if user is involved
                  if (
                    newReq.initiator_id !== userId &&
                    newReq.initiatee_id !== userId
                  ) {
                    return oldData;
                  }

                  const formattedReq = mapRequestToCamel(newReq);

                  // Prevent duplicates
                  if (oldData.some((r) => r.id === formattedReq.id)) {
                    return oldData;
                  }

                  return [formattedReq, ...oldData];
                }

                if (payload.eventType === "UPDATE") {
                  const updated = payload.new as DatabaseMessageRequest;

                  // Only process if user is involved
                  if (
                    updated.initiator_id !== userId &&
                    updated.initiatee_id !== userId
                  ) {
                    return oldData;
                  }

                  const formattedReq = mapRequestToCamel(updated);

                  return oldData.map((r) =>
                    r.id === formattedReq.id ? formattedReq : r,
                  );
                }

                if (payload.eventType === "DELETE") {
                  const deleted = payload.old as DatabaseMessageRequest;
                  const deletedId = requestIdSchema.parse(deleted.id);

                  return oldData.filter((r) => r.id !== deletedId);
                }

                return oldData;
              } catch (error) {
                console.error("❌ Error processing real-time update:", error);
                return oldData;
              }
            },
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to message requests real-time");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Message requests subscription error");
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Message requests subscription timed out");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log("🔌 Unsubscribing from message requests");
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, placeId, queryClient]);

  return {
    requests: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

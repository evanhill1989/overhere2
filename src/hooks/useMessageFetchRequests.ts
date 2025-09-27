// src/hooks/useMessageRequests.ts (UPDATE EXISTING)
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

type MessageRequest = {
  id: string;
  initiatorId: string;
  initiateeId: string;
  status: "pending" | "accepted" | "rejected" | "canceled";
  placeId: string;
  createdAt: string;
  topic: string | null;
};

type RequestPayload = {
  id: string;
  initiator_id: string;
  initiatee_id: string;
  status: "pending" | "accepted" | "rejected" | "canceled";
  place_id: string;
  created_at: string;
  topic: string | null;
};

async function fetchMessageRequests(userId: string): Promise<MessageRequest[]> {
  const res = await fetch(`/api/requests?userId=${userId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch requests: ${res.status}`);
  }
  return res.json();
}

export function useMessageFetchRequests(userId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  // 1. React Query for data fetching + polling
  const query = useQuery({
    queryKey: ["messageRequests", userId],
    queryFn: () => fetchMessageRequests(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Longer interval since we have real-time
    staleTime: 10000,
  });

  // 2. Real-time subscriptions for instant updates
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    // Clean up any existing channel
    if (channelRef.current) {
      console.log("🧹 Cleaning up existing message requests channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log(`🔌 Setting up real-time for message requests: ${userId}`);

    const channel = supabase
      .channel(`message-requests-${userId}-${Date.now()}`) // Unique channel name
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_session_requests",
          // Filter to only requests involving this user
          filter: `or(initiator_id.eq.${userId},initiatee_id.eq.${userId})`,
        },
        (payload) => {
          console.log(
            "🔔 Real-time message request update:",
            payload.eventType,
          );

          // Update React Query cache with real-time changes
          queryClient.setQueryData(
            ["messageRequests", userId],
            (oldData: MessageRequest[] = []) => {
              if (payload.eventType === "INSERT") {
                const newReq = payload.new as RequestPayload;
                // Convert snake_case to camelCase to match our type
                const formattedReq: MessageRequest = {
                  id: newReq.id,
                  initiatorId: newReq.initiator_id,
                  initiateeId: newReq.initiatee_id,
                  status: newReq.status,
                  placeId: newReq.place_id,
                  createdAt: newReq.created_at,
                  topic: newReq.topic,
                };

                // Prevent duplicates
                if (oldData.some((r) => r.id === formattedReq.id)) {
                  return oldData;
                }
                return [formattedReq, ...oldData];
              } else if (payload.eventType === "UPDATE") {
                const updated = payload.new as RequestPayload;
                const formattedReq: MessageRequest = {
                  id: updated.id,
                  initiatorId: updated.initiator_id,
                  initiateeId: updated.initiatee_id,
                  status: updated.status,
                  placeId: updated.place_id,
                  createdAt: updated.created_at,
                  topic: updated.topic,
                };

                return oldData.map((r) =>
                  r.id === formattedReq.id ? formattedReq : r,
                );
              } else if (payload.eventType === "DELETE") {
                const deleted = payload.old as RequestPayload;
                return oldData.filter((r) => r.id !== deleted.id);
              }

              return oldData;
            },
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to message requests real-time");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Message requests subscription error");
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`🔌 Unsubscribing from message requests for ${userId}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, queryClient]);

  return query;
}

// Helper hook to get requests filtered by place
export function useMessageRequestsForPlace(
  userId: string | null,
  placeId: string | null,
) {
  const { data: allRequests = [], ...queryState } =
    useMessageFetchRequests(userId);

  const filteredRequests = allRequests.filter((r) => r.placeId === placeId);

  return {
    ...queryState,
    data: filteredRequests,
    requests: filteredRequests, // Alias for backward compatibility
  };
}

// src/hooks/realtime-hooks/useRealtimeMessageRequests.ts (UPDATED)
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type { MessageRequest, UserId, PlaceId } from "@/lib/types/database";

type MessageRequestWithTopic = MessageRequest & { topic: string | null };

// ✅ Use your existing API route
async function fetchMessageRequests(
  userId: UserId,
  placeId: PlaceId,
): Promise<MessageRequestWithTopic[]> {
  const url = `/api/requests?userId=${userId}&placeId=${placeId}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch requests: ${res.status}`);
  }

  return res.json();
}

export function useRealtimeMessageRequests(
  userId: UserId | null,
  placeId: PlaceId | null,
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 1. Use API route for initial fetch
  const query = useQuery<MessageRequestWithTopic[], Error>({
    queryKey: ["messageRequests", userId, placeId],
    queryFn: () => fetchMessageRequests(userId!, placeId!),
    enabled: !!userId && !!placeId,
    staleTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // 2. Real-time updates trigger API refetch
  useEffect(() => {
    if (!userId || !placeId) return;

    const supabase = createClient();
    const queryKey = ["messageRequests", userId, placeId];

    if (channelRef.current) {
      console.log("🧹 Cleaning up existing requests channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`message-requests-${placeId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_session_requests",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          console.log("Real-time message request update:", payload.eventType);
          console.log(
            `🔔 [UserB] Real-time event received:`,
            payload.eventType,
            payload,
          );

          // Actually handle the event instead of just logging
          queryClient.setQueryData<MessageRequestWithTopic[]>(
            ["messageRequests", userId, placeId],
            (old = []) => {
              if (payload.eventType === "INSERT" && payload.new) {
                const rawRequest = payload.new as any;
                const newRequest: MessageRequestWithTopic = {
                  id: rawRequest.id,
                  initiatorId: rawRequest.initiator_id,
                  initiateeId: rawRequest.initiatee_id,
                  placeId: rawRequest.place_id,
                  status: rawRequest.status,
                  createdAt: rawRequest.created_at,
                  respondedAt: rawRequest.responded_at,
                  topic: null, // or map from rawRequest if available
                };

                // Prevent duplicates
                if (old.some((r) => r.id === newRequest.id)) {
                  return old;
                }

                return [newRequest, ...old];
              }

              if (payload.eventType === "UPDATE" && payload.new) {
                const rawRequest = payload.new as any;
                return old.map((r) =>
                  r.id === rawRequest.id
                    ? {
                        ...r,
                        status: rawRequest.status,
                        respondedAt: rawRequest.responded_at,
                      }
                    : r,
                );
              }

              if (payload.eventType === "DELETE" && payload.old) {
                const deletedId = payload.old.id;
                return old.filter((r) => r.id !== deletedId);
              }

              return old;
            },
          );
        },
      )
      .subscribe((status) => {
        // NOTE: Removed 'async' from the callback
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to message requests real-time"); // 🛑 FIX: REMOVE THE TIMEOUT. Refetch immediately to get current data.
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Message requests subscription error");
        }
      });

    channelRef.current = channel; // This creates a strict sequence: Component mounts -> Start listening -> Fetch data.
    // This fetch is the one that pulls in existing requests and updates UserB's UI.
    // 🛑 FIX 3: Force the refetch AFTER the subscription has been initiated.
    // queryClient.refetchQueries({ queryKey });

    return () => {
      if (channelRef.current) {
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

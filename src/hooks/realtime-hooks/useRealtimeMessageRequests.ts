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
    refetchOnMount: false,
  });

  // 2. Real-time updates trigger API refetch
  useEffect(() => {
    if (!userId || !placeId) return;

    const supabase = createClient();

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
        },
        (payload) => {
          console.log(
            "🔔 Real-time message request update:",
            payload.eventType,
          );
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to message requests real-time");
          await new Promise((r) => setTimeout(r, 550));
          queryClient.refetchQueries({
            queryKey: ["messageRequests", userId, placeId],
          });
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Message requests subscription error");
        }
      });

    channelRef.current = channel;

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

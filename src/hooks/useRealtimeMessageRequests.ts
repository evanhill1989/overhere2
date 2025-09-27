// src/hooks/useRealtimeMessageRequests.ts (UPDATE)
"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useMessageFetchRequests } from "./useMessageFetchRequests";

export function useRealtimeMessageRequests(
  userId: string | null,
  placeId: string | null,
) {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useMessageFetchRequests(userId);
  const channelRef = useRef<any>(null); // ✅ ADD: Track channel reference

  useEffect(() => {
    if (!userId || !placeId) return;

    const supabase = createClient();

    // ✅ ADD: Cleanup any existing channel first
    if (channelRef.current) {
      console.log("🧹 Cleaning up existing channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log(
      `🔌 Subscribing to requests for user ${userId} at place ${placeId}`,
    );

    const channel = supabase
      .channel(`message-requests:${userId}:${placeId}:${Date.now()}`) // ✅ ADD: Unique timestamp
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

          if (payload.eventType === "INSERT") {
            const newReq = payload.new;
            if (
              newReq.initiator_id === userId ||
              newReq.initiatee_id === userId
            ) {
              queryClient.setQueryData(
                ["messageRequests", userId],
                (old: any[] = []) => {
                  // ✅ ADD: Prevent duplicates
                  if (old.some((r) => r.id === newReq.id)) return old;
                  return [newReq, ...old];
                },
              );
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new;
            if (
              updated.initiator_id === userId ||
              updated.initiatee_id === userId
            ) {
              queryClient.setQueryData(
                ["messageRequests", userId],
                (old: any[] = []) =>
                  old.map((r) => (r.id === updated.id ? updated : r)),
              );
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old;
            queryClient.setQueryData(
              ["messageRequests", userId],
              (old: any[] = []) => old.filter((r) => r.id !== deleted.id),
            );
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to message requests");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Subscription error");
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Subscription timed out");
        }
      });

    channelRef.current = channel; // ✅ ADD: Store channel reference

    return () => {
      console.log(`🔌 Unsubscribing from requests for ${userId}:${placeId}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, placeId, queryClient]);

  // Filter to current place
  const filteredRequests = requests.filter((r) => r.placeId === placeId);

  return { requests: filteredRequests, isLoading };
}

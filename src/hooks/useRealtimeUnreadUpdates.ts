"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { PlaceId, UserId } from "@/lib/types/database";

export function useRealtimeUnreadUpdates(
  placeId: PlaceId,
  currentUserId: UserId,
  enabled: boolean = true,
) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (!enabled) {
      console.log("🔕 Unread updates subscription DISABLED");
      return;
    }

    console.log("🔔 Setting up unread updates subscription");

    // Use a unique channel per user to avoid conflicts
    const channel = supabase
      .channel(`unread-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("📬 Message change detected:", payload.eventType);
          // Invalidate unread counts when any message changes
          queryClient.invalidateQueries({
            queryKey: ["unreadMessageCounts", placeId, currentUserId],
          });
        },
      )
      .subscribe((status) => {
        console.log("📡 Unread updates subscription status:", status);
      });

    return () => {
      console.log("🔌 Cleaning up unread updates subscription");
      supabase.removeChannel(channel);
    };
  }, [placeId, currentUserId, enabled, queryClient, supabase]);
}

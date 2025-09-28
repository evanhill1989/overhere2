// src/hooks/useRealtimeCheckins.ts (NEW)
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { SelectCheckin } from "@/lib/db/types";

// Fetch checkins function
async function fetchCheckins(placeId: string): Promise<SelectCheckin[]> {
  const res = await fetch(`/api/checkins?placeId=${placeId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch checkins: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}

export function useRealtimeCheckins(placeId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  // 1. React Query for initial fetch + caching
  const query = useQuery({
    queryKey: ["checkins", placeId],
    queryFn: () => fetchCheckins(placeId!),
    enabled: !!placeId,
    staleTime: 10000, // Consider fresh for 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // 2. Real-time subscription for live updates
  useEffect(() => {
    if (!placeId) return;

    const supabase = createClient();

    // Clean up any existing channel
    if (channelRef.current) {
      console.log("🧹 Cleaning up existing checkins channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log(`🔌 Setting up real-time for checkins at place: ${placeId}`);

    const channel = supabase
      .channel(`checkins-${placeId}-${Date.now()}`) // Unique channel name
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "checkins",
          filter: `place_id=eq.${placeId}`, // Only checkins at this place
        },
        (payload) => {
          console.log(
            "🔔 Real-time checkin update:",
            payload.eventType,
            payload.new || payload.old,
          );

          // Update React Query cache with real-time changes
          queryClient.setQueryData(
            ["checkins", placeId],
            (oldCheckins: SelectCheckin[] = []) => {
              if (payload.eventType === "INSERT") {
                const newCheckin = payload.new as SelectCheckin;

                // Prevent duplicates
                if (oldCheckins.some((c) => c.id === newCheckin.id)) {
                  return oldCheckins;
                }

                console.log("✅ Adding new checkin:", newCheckin.id);
                return [...oldCheckins, newCheckin];
              } else if (payload.eventType === "UPDATE") {
                const updatedCheckin = payload.new as SelectCheckin;

                console.log("✅ Updating checkin:", updatedCheckin.id);
                return oldCheckins.map((c) =>
                  c.id === updatedCheckin.id ? updatedCheckin : c,
                );
              } else if (payload.eventType === "DELETE") {
                const deletedCheckin = payload.old as SelectCheckin;

                console.log("✅ Removing checkin:", deletedCheckin.id);
                return oldCheckins.filter((c) => c.id !== deletedCheckin.id);
              }

              return oldCheckins;
            },
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Subscribed to checkins real-time for ${placeId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Checkins subscription error");
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Checkins subscription timed out");
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`🔌 Unsubscribing from checkins for place ${placeId}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [placeId, queryClient]);

  return query;
}

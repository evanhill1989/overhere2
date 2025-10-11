// src/hooks/realtime-hooks/useRealtimeCheckins.ts
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type { Checkin, DatabaseCheckin } from "@/lib/types/database";
import type { PlaceId } from "@/lib/types/core";
import { checkinIdSchema } from "@/lib/types/core";
import { mapCheckinToCamel } from "@/lib/caseConverter";
import { getCheckinsAtPlace } from "@/app/_actions/checkinQueries";

async function fetchCheckins(placeId: PlaceId): Promise<Checkin[]> {
  console.log(
    "📞 [useRealtimeCheckins] Calling getCheckinsAtPlace for:",
    placeId,
  );
  const result = await getCheckinsAtPlace(placeId);
  console.log("📬 [useRealtimeCheckins] Received", result.length, "checkins");
  return result;
}

export function useRealtimeCheckins(placeId: PlaceId | null) {
  if (typeof window === "undefined") {
    console.log("❌ This code is running on the server (unexpected!)");
  } else {
    console.log("✅ This code is running on the client");
  }

  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  console.log(
    "🎬 [useRealtimeCheckins] Hook initialized with placeId:",
    placeId,
  );

  // 1. Fetch initial data via server action
  const query = useQuery<Checkin[], Error>({
    queryKey: ["checkins", placeId],
    queryFn: () => {
      console.log("🔄 [useRealtimeCheckins] Query function executing");
      return fetchCheckins(placeId!);
    },
    enabled: !!placeId,
    staleTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  console.log("📊 [useRealtimeCheckins] Query state:", {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    dataLength: query.data?.length,
    error: query.error?.message,
  });

  // 2. Real-time subscription
  useEffect(() => {
    if (!placeId) {
      console.log(
        "⚠️ [useRealtimeCheckins] No placeId, skipping real-time setup",
      );
      return;
    }

    if (channelRef.current) {
      console.log("⚠️ Channel already exists, skipping subscription setup");
      return;
    }

    console.log(
      "📡 [useRealtimeCheckins] Setting up real-time subscription for:",
      placeId,
    );
    const supabase = createClient();

    if (channelRef.current) {
      console.log("🧹 [useRealtimeCheckins] Cleaning up existing channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `checkins-${placeId}-${Date.now()}`;
    console.log("📺 [useRealtimeCheckins] Creating channel:", channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          console.log("🔔 [useRealtimeCheckins] Real-time event received:", {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
          });
          console.log("📦 [useRealtimeCheckins] Payload data:", payload);

          queryClient.setQueryData<Checkin[]>(
            ["checkins", placeId],
            (old = []) => {
              console.log(
                "📝 [useRealtimeCheckins] Current cache state:",
                old.length,
                "checkins",
              );

              try {
                if (payload.eventType === "INSERT" && payload.new) {
                  console.log("➕ [useRealtimeCheckins] Processing INSERT");
                  console.log(
                    "📦 [useRealtimeCheckins] Raw new data:",
                    payload.new,
                  );

                  const newCheckin = mapCheckinToCamel(
                    payload.new as DatabaseCheckin,
                  );
                  console.log(
                    "✅ [useRealtimeCheckins] Mapped new checkin:",
                    newCheckin.id,
                  );

                  if (old.some((c) => c.id === newCheckin.id)) {
                    console.log(
                      "⚠️ [useRealtimeCheckins] Duplicate checkin detected, skipping",
                    );
                    return old;
                  }

                  const newState = [...old, newCheckin];
                  console.log(
                    "✅ [useRealtimeCheckins] Added checkin. New count:",
                    newState.length,
                  );
                  return newState;
                }

                if (payload.eventType === "UPDATE" && payload.new) {
                  console.log("🔄 [useRealtimeCheckins] Processing UPDATE");
                  const updated = mapCheckinToCamel(
                    payload.new as DatabaseCheckin,
                  );
                  console.log(
                    "✅ [useRealtimeCheckins] Mapped updated checkin:",
                    updated.id,
                  );

                  const newState = old.map((c) => {
                    if (c.id === updated.id) {
                      console.log(
                        "🔄 [useRealtimeCheckins] Replacing checkin:",
                        c.id,
                      );
                      return updated;
                    }
                    return c;
                  });
                  return newState;
                }

                if (payload.eventType === "DELETE" && payload.old) {
                  console.log("➖ [useRealtimeCheckins] Processing DELETE");
                  const deletedId = checkinIdSchema.parse(
                    (payload.old as DatabaseCheckin).id,
                  );
                  console.log(
                    "✅ [useRealtimeCheckins] Deleting checkin:",
                    deletedId,
                  );

                  const newState = old.filter((c) => c.id !== deletedId);
                  console.log(
                    "✅ [useRealtimeCheckins] Removed checkin. New count:",
                    newState.length,
                  );
                  return newState;
                }

                console.log(
                  "⚠️ [useRealtimeCheckins] Unknown event type or missing data",
                );
                return old;
              } catch (error) {
                console.error(
                  "❌ [useRealtimeCheckins] Real-time update error:",
                  error,
                );
                console.error(
                  "❌ [useRealtimeCheckins] Error details:",
                  error instanceof Error ? error.stack : error,
                );
                return old;
              }
            },
          );
        },
      )
      .subscribe((status) => {
        console.log("📡 [useRealtimeCheckins] Subscription status:", status);

        if (status === "SUBSCRIBED") {
          console.log(
            "✅ [useRealtimeCheckins] Successfully subscribed to real-time",
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ [useRealtimeCheckins] Channel error");
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ [useRealtimeCheckins] Subscription timed out");
        } else if (status === "CLOSED") {
          console.log("🔌 [useRealtimeCheckins] Subscription closed");
        }
      });

    channelRef.current = channel;
    console.log("📺 [useRealtimeCheckins] Channel stored in ref");

    return () => {
      if (channelRef.current) {
        console.log(
          "🔌 [useRealtimeCheckins] Cleanup: Unsubscribing from channel",
        );
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [placeId, queryClient]);

  return query;
}

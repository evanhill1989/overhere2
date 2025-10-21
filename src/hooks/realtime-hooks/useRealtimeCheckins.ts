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
  return getCheckinsAtPlace(placeId);
}

export function useRealtimeCheckins(placeId: PlaceId | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  console.log("🔍 [useRealtimeCheckins] Called with:", {
    placeId,
    placeIdType: typeof placeId,
    enabled: !!placeId,
  });
  // 1. Fetch initial data
  const query = useQuery<Checkin[], Error>({
    queryKey: ["checkins", placeId],
    queryFn: () => {
      console.log(
        "🔍 [useRealtimeCheckins] queryFn called with placeId:",
        placeId,
      );
      return fetchCheckins(placeId!);
    },
    enabled: !!placeId,
    staleTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // 2. Real-time subscription
  useEffect(() => {
    if (!placeId) return;

    const supabase = createClient();

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`checkins-${placeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          queryClient.setQueryData<Checkin[]>(
            ["checkins", placeId],
            (old = []) => {
              try {
                if (payload.eventType === "INSERT" && payload.new) {
                  const newCheckin = mapCheckinToCamel(
                    payload.new as DatabaseCheckin,
                  );

                  if (old.some((c) => c.id === newCheckin.id)) {
                    return old;
                  }

                  return [...old, newCheckin];
                }

                if (payload.eventType === "UPDATE" && payload.new) {
                  const updated = mapCheckinToCamel(
                    payload.new as DatabaseCheckin,
                  );

                  return old.map((c) => (c.id === updated.id ? updated : c));
                }

                if (payload.eventType === "DELETE" && payload.old) {
                  const deletedId = checkinIdSchema.parse(
                    (payload.old as DatabaseCheckin).id,
                  );

                  return old.filter((c) => c.id !== deletedId);
                }

                return old;
              } catch (error) {
                console.error("Real-time update error:", error);
                return old;
              }
            },
          );

          queryClient.invalidateQueries({
            queryKey: ["checkins", placeId],
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [placeId, queryClient]);

  return query;
}

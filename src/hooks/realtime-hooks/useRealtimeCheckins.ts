// src/hooks/realtime-hooks/useRealtimeCheckins.ts
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { checkinIdSchema } from "@/lib/types/database";
import type { Checkin, DatabaseCheckin } from "@/lib/types/database";
import type { PlaceId } from "@/lib/types/core";

import { mapCheckinToCamel } from "@/lib/caseConverter";
import { getCheckinsAtPlace } from "@/app/_actions/checkinQueries";

async function fetchCheckins(placeId: PlaceId): Promise<Checkin[]> {
  return getCheckinsAtPlace(placeId);
}

export function useRealtimeCheckins(
  placeId: PlaceId | null,
  isPrimed: boolean,
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 2. Real-time subscription
  useEffect(() => {
    if (!placeId) return;

    const supabase = createClient();
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
          // Handle updates immediately
          // Force refetch to ensure consistency
          queryClient.invalidateQueries({
            queryKey: ["checkins", placeId],
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // NOW fetch initial data after subscription is ready
          queryClient.refetchQueries({
            queryKey: ["checkins", placeId],
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [placeId, queryClient]); // Remove isPrimed dependency

  // 1. Fetch initial data
  const query = useQuery<Checkin[], Error>({
    queryKey: ["checkins", placeId],
    queryFn: () => {
      return fetchCheckins(placeId!);
    },
    enabled: !!placeId && isPrimed,
    staleTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return query;
}

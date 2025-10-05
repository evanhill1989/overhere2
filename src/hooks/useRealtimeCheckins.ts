// src/hooks/useRealtimeCheckins.ts
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type {
  Checkin,
  DatabaseCheckin,
  ApiCheckin,
} from "@/lib/types/database";
import type { PlaceId, CheckinId } from "@/lib/types/core";
import { checkinIdSchema } from "@/lib/types/core";

import { mapApiToCheckin, mapCheckinToCamel } from "@/lib/caseConverter";

async function fetchCheckins(placeId: PlaceId): Promise<Checkin[]> {
  const res = await fetch(`/api/checkins?placeId=${placeId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch checkins: ${res.status}`);
  }

  const rawCheckins: ApiCheckin[] = await res.json();
  return rawCheckins.map(mapApiToCheckin);
}

export function useRealtimeCheckins(placeId: PlaceId | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial data
  const query = useQuery<Checkin[], Error>({
    queryKey: ["checkins", placeId],
    queryFn: () => fetchCheckins(placeId!),
    enabled: !!placeId,
    staleTime: 10000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!placeId) return;

    const supabase = createClient();

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`checkins-${placeId}-${Date.now()}`)
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
                  if (old.some((c) => c.id === newCheckin.id)) return old;
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

// ============================================
// HELPER FUNCTIONS
// ============================================

export function extractCheckinId(checkin: Checkin): CheckinId {
  return checkin.id;
}

export function extractUserId(checkin: Checkin) {
  return checkin.userId;
}

export function extractPlaceId(checkin: Checkin): PlaceId {
  return checkin.placeId;
}

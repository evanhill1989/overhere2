// src/hooks/useRealtimeCheckins.ts (FIX TypeScript errors)
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { SelectCheckin } from "@/lib/db/types";

// ✅ FIXED: Helper function with proper null handling and boolean operators
function mapCheckinFromDatabase(rawCheckin: any): SelectCheckin {
  return {
    id: rawCheckin.id,
    userId: rawCheckin.user_id,
    placeId: rawCheckin.place_id,
    placeName: rawCheckin.place_name,
    placeAddress: rawCheckin.place_address,
    latitude: rawCheckin.latitude,
    longitude: rawCheckin.longitude,
    checkinStatus: rawCheckin.checkin_status,
    topic: rawCheckin.topic,
    isActive: rawCheckin.is_active,
    createdAt: rawCheckin.created_at,
    checkedOutAt: rawCheckin.checked_out_at, // This can be null, which is fine
  };
}

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
  const channelRef = useRef<ReturnType
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  const query = useQuery({
    queryKey: ["checkins", placeId],
    queryFn: () => fetchCheckins(placeId!), // ✅ Non-null assertion is safe here due to enabled check
    enabled: !!placeId, // ✅ This ensures placeId is truthy before queryFn runs
    staleTime: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!placeId) return;

    const supabase = createClient();

    if (channelRef.current) {
      console.log("🧹 Cleaning up existing checkins channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log(`🔌 Setting up real-time for checkins at place: ${placeId}`);

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
          console.log(
            "🔔 Real-time checkin update:",
            payload.eventType,
            payload.new || payload.old,
          );

          queryClient.setQueryData(
            ["checkins", placeId],
            (oldCheckins: SelectCheckin[] = []) => {
              if (payload.eventType === "INSERT") {
                // ✅ FIXED: Proper null check
                if (!payload.new) return oldCheckins;
                
                const newCheckin = mapCheckinFromDatabase(payload.new);

                if (oldCheckins.some((c) => c.id === newCheckin.id)) {
                  return oldCheckins;
                }

                console.log("✅ Adding mapped checkin:", newCheckin);
                return [...oldCheckins, newCheckin];
              } else if (payload.eventType === "UPDATE") {
                // ✅ FIXED: Proper null check
                if (!payload.new) return oldCheckins;
                
                const updatedCheckin = mapCheckinFromDatabase(payload.new);

                console.log("✅ Updating mapped checkin:", updatedCheckin);
                return oldCheckins.map((c) =>
                  c.id === updatedCheckin.id ? updatedCheckin : c,
                );
              } else if (payload.eventType === "DELETE") {
                // ✅ FIXED: Proper null check and typing
                if (!payload.old) return oldCheckins;
                
                const deletedCheckin = payload.old as { id: number };

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
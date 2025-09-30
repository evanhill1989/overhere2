// src/hooks/useRealtimeCheckins.ts - ONLY CANONICAL TYPE SYSTEM
"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ✅ ONLY import from canonical type system
import type { Checkin } from "@/lib/types/database";
import type { PlaceId, CheckinId, UserId } from "@/lib/types/core";
import {
  checkinIdSchema,
  userIdSchema,
  placeIdSchema,
  checkinStatusSchema,
  validatedTopicSchema,
  timestampSchema,
  placeNameSchema,
  placeAddressSchema,
} from "@/lib/types/core";

// ============================================
// RAW DATABASE PAYLOAD TYPE (snake_case from Postgres)
// ============================================
type DatabaseCheckinPayload = {
  id: number;
  user_id: string;
  place_id: string;
  place_name: string;
  place_address: string;
  latitude: number | null;
  longitude: number | null;
  checkin_status: "available" | "busy";
  topic: string | null;
  is_active: boolean;
  created_at: string;
  checked_out_at: string | null;
};

// ============================================
// MAPPER: Database → Validated Canonical Type
// ============================================
function validateDatabaseCheckin(raw: unknown): Checkin {
  // Type guard for runtime safety
  const payload = raw as DatabaseCheckinPayload;

  try {
    // ✅ Validate each field with canonical schemas
    return {
      id: checkinIdSchema.parse(payload.id),
      userId: userIdSchema.parse(payload.user_id),
      placeId: placeIdSchema.parse(payload.place_id),
      placeName: placeNameSchema.parse(payload.place_name),
      placeAddress: placeAddressSchema.parse(payload.place_address),
      latitude: payload.latitude,
      longitude: payload.longitude,
      checkinStatus: checkinStatusSchema.parse(payload.checkin_status),
      topic: payload.topic ? validatedTopicSchema.parse(payload.topic) : null,
      isActive: payload.is_active,
      createdAt: timestampSchema.parse(payload.created_at),
      checkedOutAt: payload.checked_out_at
        ? timestampSchema.parse(payload.checked_out_at)
        : null,
    };
  } catch (error) {
    console.error("❌ Failed to validate checkin from database:", error);
    console.error("❌ Raw payload:", payload);
    throw new Error(`Invalid checkin data: ${error}`);
  }
}

// ============================================
// FETCH FUNCTION
// ============================================
async function fetchCheckins(placeId: PlaceId): Promise<Checkin[]> {
  const res = await fetch(`/api/checkins?placeId=${placeId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch checkins: ${res.status} ${res.statusText}`,
    );
  }

  const rawCheckins: unknown[] = await res.json();
  return rawCheckins.map(validateDatabaseCheckin);
}

// ============================================
// REAL-TIME HOOK
// ============================================
export function useRealtimeCheckins(placeId: PlaceId | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const query = useQuery<Checkin[], Error>({
    queryKey: ["checkins", placeId],
    queryFn: () => fetchCheckins(placeId!),
    enabled: !!placeId,
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
          console.log("🔔 Real-time checkin update:", payload.eventType);

          queryClient.setQueryData<Checkin[]>(
            ["checkins", placeId],
            (oldCheckins = []) => {
              try {
                if (payload.eventType === "INSERT") {
                  if (!payload.new) return oldCheckins;

                  const newCheckin = validateDatabaseCheckin(payload.new);

                  if (oldCheckins.some((c) => c.id === newCheckin.id)) {
                    console.log(
                      "⚠️ Duplicate checkin, skipping:",
                      newCheckin.id,
                    );
                    return oldCheckins;
                  }

                  console.log("✅ Adding validated checkin:", newCheckin.id);
                  return [...oldCheckins, newCheckin];
                } else if (payload.eventType === "UPDATE") {
                  if (!payload.new) return oldCheckins;

                  const updatedCheckin = validateDatabaseCheckin(payload.new);

                  console.log(
                    "✅ Updating validated checkin:",
                    updatedCheckin.id,
                  );
                  return oldCheckins.map((c) =>
                    c.id === updatedCheckin.id ? updatedCheckin : c,
                  );
                } else if (payload.eventType === "DELETE") {
                  if (!payload.old) return oldCheckins;

                  const deletedId = checkinIdSchema.parse(
                    (payload.old as DatabaseCheckinPayload).id,
                  );

                  console.log("✅ Removing checkin:", deletedId);
                  return oldCheckins.filter((c) => c.id !== deletedId);
                }

                return oldCheckins;
              } catch (error) {
                console.error("❌ Error processing real-time update:", error);
                console.error("❌ Payload:", payload);
                return oldCheckins;
              }
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

// ============================================
// HELPER FUNCTIONS
// ============================================
export function extractCheckinId(checkin: Checkin): CheckinId {
  return checkin.id;
}

export function extractUserId(checkin: Checkin): UserId {
  return checkin.userId;
}

export function extractPlaceId(checkin: Checkin): PlaceId {
  return checkin.placeId;
}

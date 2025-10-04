// src/hooks/useRealtimeCheckins.ts - FIXED FOR CAMELCASE API
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
// RAW API PAYLOAD TYPE (camelCase from API route)
// ============================================
type ApiCheckinPayload = {
  id: number;
  userId: string; // ✅ camelCase from API
  placeId: string; // ✅ camelCase from API
  placeName: string;
  placeAddress: string;
  latitude: number | null;
  longitude: number | null;
  checkinStatus: "available" | "busy";
  topic: string | null;
  isActive: boolean;
  createdAt: string;
  checkedOutAt: string | null;
};

// ============================================
// RAW DATABASE PAYLOAD TYPE (snake_case from Postgres/Realtime)
// ============================================
type DatabaseCheckinPayload = {
  id: number;
  user_id: string; // ✅ snake_case from database
  place_id: string; // ✅ snake_case from database
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
// MAPPERS: Different sources → Validated Canonical Type
// ============================================

// ✅ For API responses (already camelCase)
function validateApiCheckin(raw: unknown): Checkin {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid checkin data: not an object");
  }

  const payload = raw as ApiCheckinPayload;

  if (
    typeof payload.id !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.placeId !== "string"
  ) {
    console.error("❌ Missing required fields in API payload:", payload);
    throw new Error("Invalid checkin data: missing required fields");
  }

  try {
    const validated: Checkin = {
      id: checkinIdSchema.parse(payload.id),
      userId: userIdSchema.parse(payload.userId), // ✅ camelCase
      placeId: placeIdSchema.parse(payload.placeId), // ✅ camelCase
      placeName: placeNameSchema.parse(payload.placeName),
      placeAddress: placeAddressSchema.parse(payload.placeAddress),
      latitude: payload.latitude,
      longitude: payload.longitude,
      checkinStatus: checkinStatusSchema.parse(payload.checkinStatus),
      topic: payload.topic ? validatedTopicSchema.parse(payload.topic) : null,
      isActive: payload.isActive,
      createdAt: timestampSchema.parse(payload.createdAt),
      checkedOutAt: payload.checkedOutAt
        ? timestampSchema.parse(payload.checkedOutAt)
        : null,
    };

    console.log("✅ Successfully validated API checkin:", validated.id);
    return validated;
  } catch (error) {
    console.error("❌ Failed to validate API checkin:", error);
    console.error("❌ Raw payload:", JSON.stringify(payload, null, 2));
    throw new Error(`Invalid checkin data: ${error}`);
  }
}

// ✅ For realtime database payloads (snake_case)
function validateDatabaseCheckin(raw: unknown): Checkin {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid checkin data: not an object");
  }

  const payload = raw as DatabaseCheckinPayload;

  if (
    typeof payload.id !== "number" ||
    typeof payload.user_id !== "string" ||
    typeof payload.place_id !== "string"
  ) {
    console.error("❌ Missing required fields in database payload:", payload);
    throw new Error("Invalid checkin data: missing required fields");
  }

  try {
    const validated: Checkin = {
      id: checkinIdSchema.parse(payload.id),
      userId: userIdSchema.parse(payload.user_id), // ✅ snake_case
      placeId: placeIdSchema.parse(payload.place_id), // ✅ snake_case
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

    console.log("✅ Successfully validated database checkin:", validated.id);
    return validated;
  } catch (error) {
    console.error("❌ Failed to validate database checkin:", error);
    console.error("❌ Raw payload:", JSON.stringify(payload, null, 2));
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

  if (!Array.isArray(rawCheckins)) {
    console.error("❌ API did not return an array:", rawCheckins);
    throw new Error("Invalid API response: expected array");
  }

  console.log(`📥 Fetched ${rawCheckins.length} checkins for place ${placeId}`);

  // ✅ Use validateApiCheckin since API returns camelCase
  return rawCheckins.map((raw, index) => {
    try {
      return validateApiCheckin(raw); // ✅ Changed from validateDatabaseCheckin
    } catch (error) {
      console.error(`❌ Failed to validate checkin at index ${index}:`, error);
      throw error;
    }
  });
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
                  if (!payload.new) {
                    console.warn("⚠️ INSERT event without new data");
                    return oldCheckins;
                  }

                  // ✅ Use validateDatabaseCheckin for realtime (snake_case)
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
                  if (!payload.new) {
                    console.warn("⚠️ UPDATE event without new data");
                    return oldCheckins;
                  }

                  // ✅ Use validateDatabaseCheckin for realtime (snake_case)
                  const updatedCheckin = validateDatabaseCheckin(payload.new);

                  console.log(
                    "✅ Updating validated checkin:",
                    updatedCheckin.id,
                  );
                  return oldCheckins.map((c) =>
                    c.id === updatedCheckin.id ? updatedCheckin : c,
                  );
                } else if (payload.eventType === "DELETE") {
                  if (!payload.old) {
                    console.warn("⚠️ DELETE event without old data");
                    return oldCheckins;
                  }

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

// src/hooks/useMessageSession.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { subHours } from "date-fns";

import type { MessageSession, UserId, PlaceId } from "@/lib/types/database";
import {
  sessionIdSchema,
  userIdSchema,
  placeIdSchema,
  messageSessionStatusSchema,
  timestampSchema,
  requestIdSchema,
} from "@/lib/types/database";

type DatabaseMessageSession = {
  id: string;
  place_id: string;
  initiator_id: string;
  initiatee_id: string;
  source_request_id: string | null;
  created_at: string;
  status: "active" | "expired";
  expires_at: string | null;
  closed_at: string | null;
};

function mapSessionToCamel(raw: DatabaseMessageSession): MessageSession {
  return {
    id: sessionIdSchema.parse(raw.id),
    placeId: placeIdSchema.parse(raw.place_id),
    initiatorId: userIdSchema.parse(raw.initiator_id),
    initiateeId: userIdSchema.parse(raw.initiatee_id),
    sourceRequestId: raw.source_request_id
      ? requestIdSchema.parse(raw.source_request_id)
      : undefined,
    createdAt: timestampSchema.parse(new Date(raw.created_at)),
    status: messageSessionStatusSchema.parse(raw.status),
    expiresAt: raw.expires_at
      ? timestampSchema.parse(new Date(raw.expires_at))
      : undefined,
    closedAt: raw.closed_at
      ? timestampSchema.parse(new Date(raw.closed_at))
      : undefined,
  };
}

async function fetchMessageSession(
  userId: UserId,
  placeId: PlaceId,
): Promise<MessageSession | null> {
  const supabase = createClient();
  const twoHoursAgo = subHours(new Date(), 2);

  const { data, error } = await supabase
    .from("message_sessions")
    .select("*")
    .eq("place_id", placeId)
    .or(`initiator_id.eq.${userId},initiatee_id.eq.${userId}`)
    .gte("created_at", twoHoursAgo.toISOString())
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  return data ? mapSessionToCamel(data) : null;
}

/**
 * Fetch-only hook for message sessions (no real-time)
 * Use this for initial SSR prefetching or when real-time isn't needed
 */
export function useMessageSession(
  userId: UserId | null,
  placeId: PlaceId | null,
) {
  return useQuery<MessageSession | null, Error>({
    queryKey: ["messageSession", userId, placeId],
    queryFn: () => fetchMessageSession(userId!, placeId!),
    enabled: !!userId && !!placeId,
    staleTime: 30000, // 30 seconds
  });
}

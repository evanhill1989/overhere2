// src/hooks/realtime-hooks/useRealtimeMessageRequests.ts
"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query"; // 💡 Import useQueryClient
import { createClient } from "@/utils/supabase/client";
import type {
  MessageRequest,
  UserId,
  PlaceId,
  MessageRequestStatus,
} from "@/lib/types/database";
import {
  MESSAGE_REQUEST_STATUS,
  timestampSchema,
  requestIdSchema,
  userIdSchema,
  placeIdSchema,
} from "@/lib/types/database"; // 💡 Import Status Constants

type MessageRequestWithTopic = MessageRequest & { topic: string | null };

type RawMessageRequest = {
  id: string;
  initiator_id: string;
  initiatee_id: string;
  place_id: string;
  status: MessageRequestStatus;
  created_at: string;
  responded_at: string | null;
};

// NOTE: The commented-out TanStack Query logic remains commented out,
// and we are managing state via useState/useEffect as per your current file structure.

export function useRealtimeMessageRequests(
  userId: UserId | null,
  placeId: PlaceId | null,
  isPrimed: boolean,
) {
  // 💡 Initialize Query Client
  const queryClient = useQueryClient(); // for updating session not session_requests
  const [requests, setRequests] = useState<MessageRequestWithTopic[]>([]);

  useEffect(() => {
    if (!userId || !placeId || !isPrimed) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`message-requests-${placeId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_session_requests",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          // Extract the new (updated) data
          const rawNewData = payload.new as
            | (Record<string, unknown> & {
                status: MessageRequestStatus;
                initiator_id: UserId;
              })
            | null;

          if (payload.eventType === "UPDATE" && rawNewData) {
            // Check if the update resulted in an 'accepted' status
            if (rawNewData.status === MESSAGE_REQUEST_STATUS.ACCEPTED) {
              // Verify the current user is the INITIATOR of this request
              if (rawNewData.initiator_id === userId) {
                // Refetch the specific session query that useRealtimeMessageSession is running
                const sessionQueryKey = [
                  "messageSession",
                  userId,
                  placeId,
                ] as const;

                // 1. Force the refetch
                queryClient.refetchQueries({
                  queryKey: sessionQueryKey,
                });
              }
            }
          }
          // ==========================================================

          setRequests((old) => {
            if (payload.eventType === "INSERT" && payload.new) {
              const raw = payload.new as RawMessageRequest;
              const newReq: MessageRequestWithTopic = {
                id: requestIdSchema.parse(raw.id),
                initiatorId: userIdSchema.parse(raw.initiator_id),
                initiateeId: userIdSchema.parse(raw.initiatee_id),
                placeId: placeIdSchema.parse(raw.place_id),
                status: raw.status,
                createdAt: timestampSchema.parse(new Date(raw.created_at)),
                respondedAt: raw.responded_at
                  ? timestampSchema.parse(new Date(raw.responded_at))
                  : null,
                topic: null,
              };
              if (old.some((r) => r.id === newReq.id)) return old;
              return [newReq, ...old];
            }
            if (payload.eventType === "UPDATE" && payload.new) {
              const raw = payload.new as RawMessageRequest;
              return old.map((r) =>
                r.id === raw.id
                  ? {
                      ...r,
                      status: raw.status,
                      respondedAt: raw.responded_at
                        ? timestampSchema.parse(new Date(raw.responded_at))
                        : null,
                    }
                  : r,
              );
            }
            if (payload.eventType === "DELETE" && payload.old) {
              const deletedId = payload.old.id;
              return old.filter((r) => r.id !== deletedId);
            }
            return old;
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          queryClient.refetchQueries({
            queryKey: ["messageRequests", userId, placeId],
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // 💡 Add queryClient to the dependency array
  }, [userId, placeId, queryClient, isPrimed]);

  return { requests, isLoading: false, error: null };
}

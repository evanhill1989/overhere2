// src/hooks/useRealtimeMessageRequests.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type MessageRequest = {
  id: string;
  initiatorId: string;
  initiateeId: string;
  status: "pending" | "accepted" | "rejected" | "canceled";
  placeId: string;
  createdAt: string;
  topic: string | null;
};

export function useRealtimeMessageRequests(
  userId: string | null,
  placeId: string | null,
) {
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !placeId) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Initial fetch
    const fetchRequests = async () => {
      console.log("📡 Fetching initial message requests...");

      const { data, error } = await supabase
        .from("message_session_requests")
        .select("*")
        .or(`initiator_id.eq.${userId},initiatee_id.eq.${userId}`)
        .eq("place_id", placeId)
        .gte("created_at", twoHoursAgo)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching requests:", error);
      } else {
        console.log("✅ Fetched requests:", data?.length || 0);
        setRequests(data || []);
      }

      setIsLoading(false);
    };

    fetchRequests();

    // Set up real-time subscription
    console.log(
      `🔌 Subscribing to requests for user ${userId} at place ${placeId}`,
    );

    const channel = supabase
      .channel(`message-requests:${userId}:${placeId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "message_session_requests",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          console.log(
            "🔔 Real-time message request update:",
            payload.eventType,
          );

          if (payload.eventType === "INSERT") {
            const newReq = payload.new as MessageRequest;

            // Only add if this user is involved
            if (
              newReq.initiatorId === userId ||
              newReq.initiateeId === userId
            ) {
              console.log("➕ Adding new request:", newReq.id);
              setRequests((prev) => {
                // Prevent duplicates
                if (prev.some((r) => r.id === newReq.id)) return prev;
                return [newReq, ...prev];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as MessageRequest;

            // Only update if this user is involved
            if (
              updated.initiatorId === userId ||
              updated.initiateeId === userId
            ) {
              console.log(
                "🔄 Updating request:",
                updated.id,
                "->",
                updated.status,
              );
              setRequests((prev) =>
                prev.map((r) => (r.id === updated.id ? updated : r)),
              );
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            console.log("🗑️ Deleting request:", deleted.id);
            setRequests((prev) => prev.filter((r) => r.id !== deleted.id));
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to message requests");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Subscription error");
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Subscription timed out");
        }
      });

    // Cleanup
    return () => {
      console.log(`🔌 Unsubscribing from requests for ${userId}:${placeId}`);
      supabase.removeChannel(channel);
    };
  }, [userId, placeId]);

  return { requests, isLoading };
}

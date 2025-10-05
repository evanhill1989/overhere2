// src/hooks/useRealtimeMessages.ts (UPDATE)
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Message } from "@/lib/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";
// Fetch messages function
async function fetchMessages(sessionId: string): Promise<Message[]> {
  console.log(`📥 Fetching messages for session: ${sessionId}`);
  const supabase = createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  const messages = (data || []).map((msg) => ({
    id: msg.id,
    sessionId: msg.session_id,
    content: msg.content,
    senderCheckinId: msg.sender_checkin_id,
    createdAt: msg.created_at,
    deliveredAt: msg.delivered_at,
    readAt: msg.read_at,
  }));

  console.log(`✅ Fetched ${messages.length} messages`);
  return messages;
}

export function useRealtimeMessages(sessionId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionReadyRef = useRef(false);

  console.log(
    `🎬 useRealtimeMessages hook initialized for session: ${sessionId}`,
  );

  // 1. React Query for initial fetch + caching
  const query = useQuery({
    queryKey: ["messages", sessionId],
    queryFn: () => fetchMessages(sessionId),
    enabled: !!sessionId,
    staleTime: 5000, // Consider fresh for 5 seconds
    refetchOnWindowFocus: false, // Real-time handles updates
  });

  // 2. Real-time subscription for live updates
  useEffect(() => {
    if (!sessionId) {
      console.log("⚠️ No sessionId, skipping real-time setup");
      return;
    }

    // Clean up existing channel
    if (channelRef.current) {
      console.log("🧹 Cleaning up existing message channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      subscriptionReadyRef.current = false;
    }

    console.log(
      `📡 Setting up real-time for messages in session: ${sessionId}`,
    );
    const channel = supabase
      .channel(`messages-${sessionId}-${Date.now()}`) // Unique channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("🔔 Real-time INSERT event received:", payload);

          if (!subscriptionReadyRef.current) {
            console.warn("⚠️ Subscription not ready, buffering message");
            return;
          }

          const rawMessage = payload.new;
          const formattedMessage: Message = {
            id: rawMessage.id,
            sessionId: rawMessage.session_id,
            content: rawMessage.content,
            senderCheckinId: rawMessage.sender_checkin_id,
            createdAt: rawMessage.created_at,
          };

          console.log("💬 Processing message:", {
            id: formattedMessage.id,
            sender: formattedMessage.senderCheckinId,
            preview: formattedMessage.content.substring(0, 30),
          });

          queryClient.setQueryData(
            ["messages", sessionId],
            (oldMessages: Message[] = []) => {
              if (oldMessages.some((msg) => msg.id === formattedMessage.id)) {
                console.log("⚠️ Duplicate message detected, skipping");
                return oldMessages;
              }
              console.log("✅ Adding message to cache");
              return [...oldMessages, formattedMessage];
            },
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to messages real-time");
          subscriptionReadyRef.current = true;
          setTimeout(() => {
            console.log("🔄 Refetching messages after subscription ready");
            queryClient.invalidateQueries({
              queryKey: ["messages", sessionId],
            });
          }, 500);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Messages subscription error");
          subscriptionReadyRef.current = false;
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Messages subscription timed out");
          subscriptionReadyRef.current = false;
        } else if (status === "CLOSED") {
          console.log("🔌 Messages subscription closed");
          subscriptionReadyRef.current = false;
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log(`🔌 Unsubscribing from messages for session ${sessionId}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        subscriptionReadyRef.current = false;
      }
    };
  }, [sessionId, queryClient, supabase]);
  console.log(`📊 Current message count: ${query.data?.length || 0}`);
  return query.data || [];
}

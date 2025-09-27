// src/hooks/useRealtimeMessages.ts (UPDATE)
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Message } from "@/components/EphemeralSessonWindow";

// Fetch messages function
async function fetchMessages(sessionId: string): Promise<Message[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data || []).map((msg) => ({
    id: msg.id,
    content: msg.content,
    senderCheckinId: msg.sender_checkin_id,
    createdAt: msg.created_at,
  }));
}

export function useRealtimeMessages(sessionId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

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
    if (!sessionId) return;

    console.log(
      `🔌 Setting up real-time for messages in session: ${sessionId}`,
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
          const rawMessage = payload.new;
          const formattedMessage: Message = {
            id: rawMessage.id,
            content: rawMessage.content,
            senderCheckinId: rawMessage.sender_checkin_id,
            createdAt: rawMessage.created_at,
          };

          console.log("📥 Real-time message received:", formattedMessage);

          // Update React Query cache
          queryClient.setQueryData(
            ["messages", sessionId],
            (oldMessages: Message[] = []) => {
              // Prevent duplicates
              if (oldMessages.some((msg) => msg.id === formattedMessage.id)) {
                return oldMessages;
              }
              return [...oldMessages, formattedMessage];
            },
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to messages real-time");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Messages subscription error");
        }
      });

    return () => {
      console.log(`🔌 Unsubscribing from messages for session ${sessionId}`);
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient, supabase]);

  return query.data || [];
}

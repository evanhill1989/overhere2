// src/hooks/realtime-hooks/useRealtimeMessages.ts
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Message } from "@/lib/types/database";

export function useRealtimeMessages(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    console.log("🎬 Setting up messages for session:", sessionId);

    // 1. Fetch initial messages
    const fetchInitialMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        // Convert to domain types
        const formattedMessages: Message[] = (data || []).map((msg) => ({
          id: msg.id,
          sessionId: msg.session_id,
          content: msg.content,
          senderCheckinId: msg.sender_checkin_id,
          createdAt: new Date(msg.created_at),
          deliveredAt: msg.delivered_at
            ? new Date(msg.delivered_at)
            : undefined,
          readAt: msg.read_at ? new Date(msg.read_at) : undefined,
        }));

        setMessages(formattedMessages);
        console.log("✅ Loaded", formattedMessages.length, "messages");
      } catch (err) {
        console.error("❌ Failed to fetch messages:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load messages",
        );
      } finally {
        setIsLoading(false);
      }
    };

    // 2. Set up real-time subscription
    const setupRealtimeSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`messages-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            console.log("🔔 New message received:", payload.new);

            const newMessage: Message = {
              id: payload.new.id,
              sessionId: payload.new.session_id,
              content: payload.new.content,
              senderCheckinId: payload.new.sender_checkin_id,
              createdAt: new Date(payload.new.created_at),
              deliveredAt: payload.new.delivered_at
                ? new Date(payload.new.delivered_at)
                : undefined,
              readAt: payload.new.read_at
                ? new Date(payload.new.read_at)
                : undefined,
            };

            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((msg) => msg.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          },
        )
        .subscribe((status) => {
          console.log("📡 Subscription status:", status);
        });

      channelRef.current = channel;
    };

    // Execute setup
    fetchInitialMessages();
    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channelRef.current) {
        console.log("🔌 Cleaning up message subscription");
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, supabase]);

  return { messages, isLoading, error };
}

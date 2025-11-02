// src/hooks/realtime-hooks/useRealtimeMessages.ts
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Message } from "@/lib/types/database";
import {
  timestampSchema,
  messageIdSchema,
  sessionIdSchema,
  checkinIdSchema,
  sanitizedContentSchema,
} from "@/lib/types/database";

interface SupabaseMessageRow {
  id: number;
  session_id: string;
  content: string;
  sender_checkin_id: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

type RealtimePayload = {
  new: {
    id: number;
    session_id: string;
    content: string;
    sender_checkin_id: string;
    created_at: string;
    delivered_at: string | null;
    read_at: string | null;
  };
};

export function useRealtimeMessages(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    // 1. Fetch initial messages
    const fetchInitialMessages = async () => {
      try {
        setIsLoading(true);

        const { data, error: fetchError } = await supabase
          .from("messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        // ✅ Convert to domain types using branded schemas
        const formattedMessages: Message[] = (data || []).map(
          (msg: SupabaseMessageRow) => ({
            id: messageIdSchema.parse(msg.id),
            sessionId: sessionIdSchema.parse(msg.session_id),
            content: sanitizedContentSchema.parse(msg.content),
            senderCheckinId: checkinIdSchema.parse(msg.sender_checkin_id),
            createdAt: timestampSchema.parse(new Date(msg.created_at)),
            deliveredAt: msg.delivered_at
              ? timestampSchema.parse(new Date(msg.delivered_at))
              : undefined,
            readAt: msg.read_at
              ? timestampSchema.parse(new Date(msg.read_at))
              : undefined,
          }),
        );

        setMessages(formattedMessages);
      } catch (err) {
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
          (payload: RealtimePayload) => {
            const newMessage: Message = {
              id: messageIdSchema.parse(payload.new.id),
              sessionId: sessionIdSchema.parse(payload.new.session_id),
              content: sanitizedContentSchema.parse(payload.new.content),
              senderCheckinId: checkinIdSchema.parse(
                payload.new.sender_checkin_id,
              ),
              createdAt: timestampSchema.parse(
                new Date(payload.new.created_at),
              ),
              deliveredAt: payload.new.delivered_at
                ? timestampSchema.parse(new Date(payload.new.delivered_at))
                : undefined,
              readAt: payload.new.read_at
                ? timestampSchema.parse(new Date(payload.new.read_at))
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
        .subscribe((status: string) => {
        });

      channelRef.current = channel;
    };

    // Execute setup
    fetchInitialMessages();
    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, supabase]);

  return { messages, isLoading };
}

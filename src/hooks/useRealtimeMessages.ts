import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Message } from "@/components/EphemeralSessionWindow";

export function useRealtimeMessages(sessionId: string) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);

  // 1. initial fetch (so history exists)
  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      setMessages(data as Message[]);
    };
    fetchInitial();
  }, [sessionId, supabase]);

  // 2. realtime listener
  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((m) => [...m, payload.new as Message]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  return messages;
}

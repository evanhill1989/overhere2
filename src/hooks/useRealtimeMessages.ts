import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Message } from "@/components/EphemeralSessonWindow";

export function useRealtimeMessages(sessionId: string) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);

  // 1. Initial fetch
  useEffect(() => {
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("❌ Error fetching initial messages:", error);
      } else if (data) {
        const formatted = data.map((msg) => ({
          id: msg.id,
          content: msg.content,
          senderCheckinId: msg.sender_checkin_id,
          createdAt: msg.created_at,
        }));
        setMessages(formatted);
      }
    };

    fetchInitial();
  }, [sessionId, supabase]);

  // 2. Realtime listener
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
          const raw = payload.new;
          const formatted: Message = {
            id: raw.id,
            content: raw.content,
            senderCheckinId: raw.sender_checkin_id,
            createdAt: raw.created_at,
          };
          console.log("📥 Realtime message received:", formatted);
          setMessages((prev) => [...prev, formatted]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  return messages;
}

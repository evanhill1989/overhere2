"use client";

import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Tables } from "@/types/supabase";
import { toast } from "sonner";

type ChatSessionRow = Tables<"chat_sessions">;

interface ChatSessionDebugProps {
  currentUserCheckinId: number | null;
}

export const ChatSessionDebug = ({
  currentUserCheckinId,
}: ChatSessionDebugProps) => {
  const [chatSessions, setChatSessions] = useState<ChatSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase client setup inline (your pattern)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabase: SupabaseClient | null = null;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.error("Failed to create Supabase client:", e);
    }
  } else {
    console.error(
      "Supabase environment variables missing for client initialization.",
    );
  }

  useEffect(() => {
    const fetchChatSessions = async () => {
      if (!supabase) {
        setError("Supabase client not initialized.");
        return;
      }

      if (!currentUserCheckinId) {
        setError("Missing currentUserCheckinId.");
        return;
      }

      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("receiver_checkin_id", currentUserCheckinId);

      if (error) {
        console.error("Error fetching chat_sessions:", error);
        toast.error("Failed to fetch chat_sessions");
        setError(error.message);
      } else {
        setChatSessions(data);
      }

      setLoading(false);
    };

    fetchChatSessions();
  }, [currentUserCheckinId]);

  return (
    <div className="mx-auto mt-4 max-w-xl rounded border bg-white p-4 shadow">
      <h2 className="mb-2 text-lg font-bold">Chat Session Debug</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && chatSessions.length === 0 && (
        <p>No visible chat_sessions for this check-in.</p>
      )}
      {chatSessions.length > 0 && (
        <pre className="overflow-x-auto rounded bg-gray-100 p-2 text-sm">
          {JSON.stringify(chatSessions, null, 2)}
        </pre>
      )}
    </div>
  );
};

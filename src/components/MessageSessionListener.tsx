// components/MessageSessionListener.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { EphemeralSessionWindow } from "./EphemeralSessonWindow";
import { MessageInput } from "./MessageInput";
import type { SelectSession } from "@/lib/db/types";

export function MessageSessionListener({
  placeId,
  currentUserId,
  currentCheckinId,
  initialSession,
  children,
}: {
  placeId: string;
  currentUserId: string;
  currentCheckinId?: number;
  initialSession: SelectSession | null;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<SelectSession | null>(initialSession);
  const supabase = createClient();
  console.log(placeId, "placeId in MessageSessionListener");

  useEffect(() => {
    const channel = supabase
      .channel(`session:${placeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_sessions",
          filter: `place_id=eq.${placeId}`,
        },
        (payload) => {
          const newSession = payload.new as SelectSession;
          const isParticipant =
            newSession.initiatorId === currentUserId ||
            newSession.initiateeId === currentUserId;
          console.log("🔥 New session inserted via Realtime:", payload.new);
          if (isParticipant) {
            console.log(
              isParticipant,
              "isParticipant insided usseEffect that set's Session which triggers rerender",
            );
            setSession(newSession);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placeId, currentUserId, supabase]);

  if (session) {
    return (
      <EphemeralSessionWindow
        session={session}
        currentUserId={currentUserId}
        checkinId={currentCheckinId}
      >
        <MessageInput
          sessionId={session.id}
          senderCheckinId={currentCheckinId}
        />
      </EphemeralSessionWindow>
    );
  }

  return <>{children}</>;
}

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
    console.log("Is this useEffect running at all for channel supabase??!!!");
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
          const raw = payload.new;
          const newSession: SelectSession = {
            id: raw.id,
            initiatorId: raw.initiator_id,
            initiateeId: raw.initiatee_id,
            placeId: raw.place_id,
            status: raw.status,
            createdAt: raw.created_at,
          };
          const isParticipant =
            newSession.initiatorId === currentUserId ||
            newSession.initiateeId === currentUserId;

          console.log("🔥 New session inserted via Realtime:", payload.new);
          console.log(isParticipant, "✅🔥🔥 isParticipant is true?!!!!");
          if (isParticipant) {
            console.log("✅ isParticipant, setting session...");
            setSession(newSession);
            console.log("📦 session state should now be updated");
            console.log(
              newSession,
              "✅📦 newSession in MessageSessionListener",
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placeId, currentUserId, supabase]);

  useEffect(() => {
    console.log("Session updated!", session);
  }, [session]);

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

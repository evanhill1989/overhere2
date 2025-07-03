"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { EphemeralSessionWindow } from "./EphemeralSessonWindow";
import { MessageInput } from "./MessageInput";
import { PlaceDetails } from "./PlaceDetails";
import type { SelectMessageSession, SelectCheckin } from "@/lib/db/types";

type Props = {
  place: { id: string; name: string; address: string };
  checkins: SelectCheckin[];
  currentUserId: string;
  currentCheckinId?: number;
  initialSession: SelectMessageSession | null;
};

export function MessageSessionListener({
  place,
  checkins,
  currentUserId,
  currentCheckinId,
  initialSession,
}: Props) {
  const [session, setSession] = useState<SelectMessageSession | null>(
    initialSession,
  );
  const [showMessaging, setShowMessaging] = useState(false); // ← force list view first

  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`session:${place.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_sessions",
          filter: `place_id=eq.${place.id}`,
        },
        (payload) => {
          const raw = payload.new;
          const newSession: SelectMessageSession = {
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

          if (isParticipant) {
            setSession(newSession);
            setShowMessaging(true);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [place.id, currentUserId, supabase]);

  if (session && showMessaging) {
    return (
      <EphemeralSessionWindow
        session={session}
        currentUserId={currentUserId}
        checkinId={currentCheckinId}
        onBack={() => setShowMessaging(false)}
        place={{ name: place.name, address: place.address }} // ✅ pass down
      >
        <MessageInput
          sessionId={session.id}
          senderCheckinId={currentCheckinId}
        />
      </EphemeralSessionWindow>
    );
  }

  return (
    <>
      <PlaceDetails
        place={place}
        checkins={checkins}
        currentUserId={currentUserId}
        activeSession={
          session
            ? {
                initiatorId: session.initiatorId,
                initiateeId: session.initiateeId,
              }
            : undefined
        }
        onResumeSession={() => setShowMessaging(true)}
      />
    </>
  );
}

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
  const [showMessaging, setShowMessaging] = useState(false);

  const supabase = createClient();

  // 🔄 Listen for session INSERTs
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

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  // ⏱ Fallback: check DB 4s after mount if session is still null
  useEffect(() => {
    if (initialSession) return;

    const timeout = setTimeout(async () => {
      const { data, error } = await supabase
        .from("message_sessions")
        .select("*")
        .eq("place_id", place.id)
        .or(`initiator_id.eq.${currentUserId},initiatee_id.eq.${currentUserId}`)
        .gte("created_at", twoHoursAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSession(data);
        setShowMessaging(true);
      } else if (error) {
        console.log(error);
      }
    }, 4000);

    return () => clearTimeout(timeout);
  }, [initialSession, place.id, currentUserId, supabase]);

  // 👀 Fallback: re-check on tab focus if session hasn't been set

  useEffect(() => {
    const handleFocus = async () => {
      if (session || initialSession) return;

      const { data } = await supabase
        .from("message_sessions")
        .select("*")
        .eq("place_id", place.id)
        .or(`initiator_id.eq.${currentUserId},initiatee_id.eq.${currentUserId}`)
        .gte("created_at", twoHoursAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSession(data);
        setShowMessaging(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [session, initialSession, place.id, currentUserId, supabase, twoHoursAgo]);

  if (session && showMessaging) {
    return (
      <EphemeralSessionWindow
        session={session}
        currentUserId={currentUserId}
        checkinId={currentCheckinId}
        onBack={() => setShowMessaging(false)}
        place={{ name: place.name, address: place.address }}
      >
        <MessageInput
          sessionId={session.id}
          senderCheckinId={currentCheckinId}
        />
      </EphemeralSessionWindow>
    );
  }

  return (
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
  );
}

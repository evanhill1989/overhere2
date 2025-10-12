"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";

import { EphemeralSessionWindow } from "@/app/places/[placeId]/_components/EphemeralSessonWindow";
import { MessageInput } from "@/components/MessageInput";
import { PlaceDetails } from "@/app/places/[placeId]/_components/PlaceDetails";
import { LoadingState, ErrorState } from "@/components/ui/data-states";

import { getCheckinsAtPlace } from "@/app/_actions/checkinQueries";
import type { UserId, PlaceId } from "@/lib/types/database";

type PlacePageClientProps = {
  placeId: PlaceId;
  userId: UserId;
  placeInfo: {
    id: PlaceId;
    name: string;
    address: string;
  };
};

export function PlacePageClient({
  placeId,
  userId,
  placeInfo,
}: PlacePageClientProps) {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [showMessaging, setShowMessaging] = useState(false);

  // ============================================
  // BASE QUERY (Hydrated from server)
  // ============================================
  const {
    data: hydratedCheckins = [],
    isLoading: hydratedLoading,
    error: hydratedError,
  } = useQuery({
    queryKey: ["checkins", placeId],
    queryFn: () => getCheckinsAtPlace(placeId),
  });

  // ============================================
  // REALTIME SUBSCRIPTION (extends hydrated cache)
  // ============================================
  const { data: checkins = hydratedCheckins, refetch: refetchCheckins } =
    useRealtimeCheckins(placeId);

  // ============================================
  // MESSAGE SESSION HOOK
  // ============================================
  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useRealtimeMessageSession(userId, placeId);

  // ============================================
  // DERIVED STATE
  // ============================================
  const currentUserCheckin = checkins.find((c) => c.userId === userId);
  const currentCheckinId = currentUserCheckin?.id;

  const isLoading = hydratedLoading || sessionLoading;
  const hasError = hydratedError || sessionError;
  useEffect(() => {
    console.log("🎬 PlacePageClient mounted/remounted for place:", placeId);
    return () => {
      console.log("🔌 PlacePageClient unmounting for place:", placeId);
    };
  }, [placeId]);

  // ============================================
  // AUTO-SHOW MESSAGING WHEN SESSION EXISTS
  // ============================================
  useEffect(() => {
    if (session && !showMessaging) {
      console.log("✅ Session detected, showing messaging interface");
      setShowMessaging(true);
    }
  }, [session, showMessaging]);

  // ============================================
  // RENDER STATES
  // ============================================
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState message="Loading place details..." />
      </div>
    );
  }

  if (hasError) {
    const errorMessage =
      hydratedError?.message ||
      sessionError?.message ||
      "Failed to load place data";

    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <ErrorState
          title="Unable to load place"
          message={errorMessage}
          onRetry={() => {
            refetchCheckins();
          }}
        />
      </div>
    );
  }

  // ============================================
  // SESSION ACTIVE → MESSAGING VIEW
  // ============================================
  if (session && showMessaging) {
    return (
      <EphemeralSessionWindow
        session={{
          id: session.id,
          placeId: session.placeId,
          initiatorId: session.initiatorId,
          initiateeId: session.initiateeId,
        }}
        currentUserId={userId}
        checkinId={currentCheckinId}
        onBack={() => setShowMessaging(false)}
        place={{ name: placeInfo.name, address: placeInfo.address }}
      >
        <MessageInput
          sessionId={session.id}
          senderCheckinId={currentCheckinId}
        />
      </EphemeralSessionWindow>
    );
  }

  // ============================================
  // DEFAULT VIEW → PLACE DETAILS
  // ============================================
  return (
    <PlaceDetails
      place={placeInfo}
      checkins={checkins}
      currentUserId={userId}
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

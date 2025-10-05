// src/app/places/[placeId]/_components/PlacePageClient.tsx
"use client";

import { useState, useEffect } from "react";
import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";
import { useRealtimeMessageRequests } from "@/hooks/realtime-hooks/useRealtimeMessageRequests";
import { EphemeralSessionWindow } from "@/app/places/[placeId]/_components/EphemeralSessonWindow";
import { MessageInput } from "@/components/MessageInput";
import { PlaceDetails } from "@/app/places/[placeId]/_components/PlaceDetails";
import { LoadingState, ErrorState } from "@/components/ui/data-states";
import type { UserId, PlaceId, MessageSession } from "@/lib/types/database";

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
  // DATA FETCHING HOOKS
  // ============================================
  const {
    data: checkins = [],
    isLoading: checkinsLoading,
    error: checkinsError,
    refetch: refetchCheckins,
  } = useRealtimeCheckins(placeId);

  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useRealtimeMessageSession(userId, placeId);

  const { requests, isLoading: requestsLoading } = useRealtimeMessageRequests(
    userId,
    placeId,
  );

  // ============================================
  // DERIVED STATE
  // ============================================
  const currentUserCheckin = checkins.find((c) => c.userId === userId);
  const currentCheckinId = currentUserCheckin?.id;

  const isLoading = checkinsLoading || sessionLoading;
  const hasError = checkinsError || sessionError;

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
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState message="Loading place details..." />
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (hasError) {
    const errorMessage =
      checkinsError?.message ||
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
  // MESSAGING VIEW (When active session exists)
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
  // PLACE DETAILS VIEW (Default view)
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

// src/app/places/[placeId]/_components/PlacePageClient.tsx (CORRECTED)
"use client";

import { useState, useEffect, useRef } from "react";

import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";

import { EphemeralSessionWindow } from "@/app/places/[placeId]/_components/EphemeralSessonWindow";
import { MessageInput } from "@/components/MessageInput";
import { PlaceDetails } from "@/app/places/[placeId]/_components/PlaceDetails";
import { LoadingState, ErrorState } from "@/components/ui/data-states";

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
  // ✅ ADD: Track what's causing re-renders
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(`🎨 PlacePageClient render #${renderCount.current}`, {
    placeId,
    userId,
    placeInfoName: placeInfo.name,
    timestamp: Date.now(),
  });

  // ✅ ADD: Track prop changes
  const prevProps = useRef({ placeId, userId, placeInfo });
  if (
    prevProps.current.placeId !== placeId ||
    prevProps.current.userId !== userId ||
    prevProps.current.placeInfo.name !== placeInfo.name
  ) {
    console.log("🔄 PlacePageClient props changed:", {
      from: prevProps.current,
      to: { placeId, userId, placeInfo },
    });
  }
  prevProps.current = { placeId, userId, placeInfo };

  const [showMessaging, setShowMessaging] = useState(false);

  // ============================================

  // ============================================
  // REALTIME SUBSCRIPTION (extends hydrated cache) - KEEP THIS
  // ============================================
  const {
    data: checkins = [],
    refetch: refetchRealtime,
    isLoading: realtimeLoading,
    error: realtimeError,
  } = useRealtimeCheckins(placeId);

  // ============================================
  // MESSAGE SESSION HOOK - KEEP THIS
  // ============================================
  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useRealtimeMessageSession(userId, placeId);

  // ============================================
  // DERIVED STATE - FIX THE LOGIC
  // ============================================

  const currentUserCheckin = checkins.find((c) => c.userId === userId);
  const currentCheckinId = currentUserCheckin?.id;

  // Combined loading/error states
  const isLoading = sessionLoading;
  const hasError = realtimeError || sessionError;
  const errorMessage =
    realtimeError?.message ||
    sessionError?.message ||
    "Failed to load place data";

  // Combined refetch function
  const refetchCheckins = () => {
    refetchRealtime();
  };

  useEffect(() => {
    console.log("🎬 PlacePageClient mounted/remounted for place:", placeId);
    return () => {
      console.log("🔌 PlacePageClient unmounting for place:", placeId);
    };
  }, [placeId]);

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
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <ErrorState
          title="Unable to load place"
          message={errorMessage}
          onRetry={refetchCheckins}
        />
      </div>
    );
  }

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
  // PASS ALL REQUIRED PROPS TO PlaceDetails
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
      // ✅ ADD: Pass the missing props
      isCheckinsLoading={realtimeLoading}
      checkinsError={realtimeError}
      onCheckinsRetry={refetchCheckins}
    />
  );
}

// src/app/places/[placeId]/_components/PlacePageClient.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";

import { LoadingState, ErrorState } from "@/components/ui/data-states";
import { MessageErrorBoundary } from "@/components/error_boundaries/MessageErrorBoundary";

import type { UserId, PlaceId } from "@/lib/types/database";
import { PlaceDetails } from "./PlaceDetails";
import router from "next/router";
import { SimpleMessagingWindow } from "./SimpleMessagingWindow";

type PlacePageClientProps = {
  placeId: PlaceId;
  userId: UserId;
  placeInfo: {
    id: PlaceId;
    name: string;
    address: string;
  };
};

// Simplified messaging states
type MessagingState = "hidden" | "active";

export function PlacePageClient({
  placeId,
  userId,
  placeInfo,
}: PlacePageClientProps) {
  // Track prop changes
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

  // ============================================
  // SIMPLIFIED MESSAGING STATE MANAGEMENT
  // ============================================
  const [messagingState, setMessagingState] =
    useState<MessagingState>("hidden");

  // ============================================
  // REALTIME SUBSCRIPTIONS
  // ============================================
  const {
    data: checkins = [],
    isLoading: realtimeLoading,
    error: realtimeError,
  } = useRealtimeCheckins(placeId);

  // Add this debug effect
  useEffect(() => {
    console.log("📄 Checkins data updated in PlacePageClient:", checkins);
  }, [checkins]);

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

  // ✅ Don't show place content until we've verified the user's check-in
  const userCheckinLoading =
    realtimeLoading || (checkins.length > 0 && !currentUserCheckin);
  const userHasActiveCheckin = !userCheckinLoading && !!currentUserCheckin;

  // Combined loading/error states
  const isLoading = sessionLoading || userCheckinLoading;
  const hasError = realtimeError || sessionError;

  const errorMessage =
    realtimeError?.message ||
    sessionError?.message ||
    "Failed to load place data";

  // ============================================
  // SIMPLIFIED MESSAGING FUNCTIONS
  // ============================================

  const openMessagingWindow = useCallback(() => {
    console.log("🪟 Opening messaging window");
    setMessagingState("active");
  }, []);

  const closeMessagingWindow = useCallback(() => {
    console.log("🚪 Closing messaging window");
    setMessagingState("hidden");
  }, []);

  // ============================================
  // SESSION CHANGE DETECTION & AUTO-MANAGEMENT
  // ============================================
  useEffect(() => {
    if (session && !sessionLoading && messagingState === "hidden") {
      console.log("✅ Session available, auto-opening messaging interface");
      openMessagingWindow();
    } else if (!session && messagingState === "active") {
      console.log("🔚 Session ended, closing messaging window");
      closeMessagingWindow();
    }
  }, [
    session,
    sessionLoading,
    messagingState,
    openMessagingWindow,
    closeMessagingWindow,
  ]);

  // ============================================
  // LIFECYCLE LOGGING
  // ============================================
  useEffect(() => {
    console.log("🎬 PlacePageClient mounted/remounted for place:", placeId);
    return () => {
      console.log("🔌 PlacePageClient unmounting for place:", placeId);
    };
  }, [placeId]);

  // ============================================
  // RENDER STATES
  // ============================================

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState
          message={
            userCheckinLoading
              ? "Verifying your check-in..."
              : "Loading place details..."
          }
        />
      </div>
    );
  }

  // ✅ New security check: User must have active check-in to see place content
  if (!userHasActiveCheckin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <ErrorState
          title="Access Denied"
          message="You must check in to this location to view its details."
          onRetry={() => router.push("/")}
        />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="Unable to load place" message={errorMessage} />
      </div>
    );
  }

  // ============================================
  // MAIN RENDER WITH SIMPLE MESSAGING
  // ============================================
  return (
    <div className="relative">
      <PlaceDetails
        place={placeInfo}
        checkins={checkins}
        currentUserId={userId}
        activeSession={session ?? undefined}
        onResumeSession={openMessagingWindow}
        onOpenMessaging={openMessagingWindow}
        isCheckinsLoading={realtimeLoading}
        checkinsError={realtimeError}
        messagingState={messagingState}
        hasActiveSession={!!session}
      />

      {/* Simple Messaging Window */}
      {session && currentCheckinId && messagingState === "active" && (
        <MessageErrorBoundary onReset={() => setMessagingState("hidden")}>
          <SimpleMessagingWindow
            sessionId={session.id}
            currentUserCheckinId={currentCheckinId}
            placeName={placeInfo.name}
            onClose={closeMessagingWindow}
          />
        </MessageErrorBoundary>
      )}
    </div>
  );
}

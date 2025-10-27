// src/app/places/[placeId]/_components/PlacePageClient.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCheckinsPolling } from "@/hooks/useCheckinsPolling";
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
  isPrimed: boolean;
};

type MessagingState = "hidden" | "active";

export function PlacePageClient({
  placeId,
  userId,
  placeInfo,
  isPrimed,
}: PlacePageClientProps) {
  const prevProps = useRef({ placeId, userId, placeInfo });
  prevProps.current = { placeId, userId, placeInfo };

  // ============================================
  // MESSAGING STATE
  // ============================================
  const [messagingState, setMessagingState] =
    useState<MessagingState>("hidden");

  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useRealtimeMessageSession(userId, placeId);

  // ============================================
  // POLLING FOR CHECKINS (REPLACES REALTIME)
  // ============================================
  const {
    data: checkins = [],
    isLoading: checkinsLoading,
    error: checkinsError,
    refetch: refetchCheckins,
  } = useCheckinsPolling(placeId, 5000); // Poll every 5 seconds

  // Force refetch when component mounts or placeId changes
  useEffect(() => {
    if (placeId) {
      console.log("🔄 Force refetch on mount/placeId change");
      refetchCheckins();
    }
  }, [placeId, refetchCheckins]);

  // Log polling updates
  useEffect(() => {
    if (checkins.length > 0) {
      console.log(
        `📊 Polling update: ${checkins.length} checkins at place ${placeId}`,
      );
    }
  }, [checkins, placeId]);

  // ============================================
  // DERIVED STATE
  // ============================================
  const currentUserCheckin = checkins.find((c) => c.userId === userId);
  const currentCheckinId = currentUserCheckin?.id;

  // Don't show place content until we've verified the user's check-in
  const userCheckinLoading =
    checkinsLoading || (checkins.length > 0 && !currentUserCheckin);
  const userHasActiveCheckin = !userCheckinLoading && !!currentUserCheckin;

  // Combined loading/error states
  const isLoading = sessionLoading || userCheckinLoading;
  const hasError = checkinsError || sessionError;

  const errorMessage =
    checkinsError?.message ||
    sessionError?.message ||
    "Failed to load place data";

  // ============================================
  // MESSAGING FUNCTIONS
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
  // SESSION CHANGE DETECTION
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
    console.log("🎬 PlacePageClient mounted with polling for place:", placeId);
    return () => {
      console.log("🔌 PlacePageClient unmounting for place:", placeId);
    };
  }, [placeId]);

  // ============================================
  // RENDER STATES
  // ============================================
  if (!isPrimed) {
    return <div className="p-4 text-center">Preparing filters...</div>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState
          message={
            userCheckinLoading
              ? "Loading check-ins..."
              : "Loading place details..."
          }
        />
      </div>
    );
  }

  // Security check: User must have active check-in to see place content
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
        <ErrorState
          title="Unable to load place"
          message={errorMessage}
          onRetry={() => refetchCheckins()}
        />
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
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
        isCheckinsLoading={checkinsLoading}
        checkinsError={checkinsError}
        messagingState={messagingState}
        hasActiveSession={!!session}
        isPrimed={isPrimed}
      />

      {/* Polling Status Indicator */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500">
        🔄 Polling active (5s)
      </div>

      {/* Simple Messaging Window */}
      {session && currentCheckinId && (
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

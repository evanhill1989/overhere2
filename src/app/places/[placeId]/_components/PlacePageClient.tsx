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

  const hasMountedRef = useRef(false);

  // ============================================
  // MESSAGING STATE
  // ============================================
  const [messagingState, setMessagingState] =
    useState<MessagingState>("hidden");

  // Track which sessions user has explicitly closed
  const [userClosedSessionIds, setUserClosedSessionIds] = useState<Set<string>>(
    new Set(),
  );

  // Track last session ID to detect changes (new session created)
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

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
      refetchCheckins();
    }
  }, [placeId, refetchCheckins]);

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
    setMessagingState("active");
    // When user manually opens, remove from closed set
    if (session?.id) {
      setUserClosedSessionIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(session.id);
        return newSet;
      });
    }
  }, [session?.id]);

  const closeMessagingWindow = useCallback(() => {
    setMessagingState("hidden");
    // Track that user explicitly closed this session
    if (session?.id) {
      setUserClosedSessionIds((prev) => new Set(prev).add(session.id));
    }
  }, [session?.id]);

  // ============================================
  // SESSION CHANGE DETECTION
  // ============================================
  useEffect(() => {
    const currentSessionId = session?.id ?? null;

    // Only update lastSessionId on mount, don't auto-open
    if (lastSessionId === null && currentSessionId !== null) {
      console.log("Initial session found on mount:", currentSessionId);
      setLastSessionId(currentSessionId);
      return; // Don't auto-open
    }

    // Case 1: New session created (ID changed from different ID)
    if (
      currentSessionId &&
      currentSessionId !== lastSessionId &&
      lastSessionId !== null
    ) {
      console.log("New session created during page session:", currentSessionId);

      // Auto-open ONLY if user hasn't explicitly closed this session before
      if (!userClosedSessionIds.has(currentSessionId)) {
        console.log("Auto-opening messaging window for new session");
        setMessagingState("active");
      } else {
        console.log(
          "User previously closed this session, keeping window hidden",
        );
      }

      setLastSessionId(currentSessionId);
    }

    // Case 2: Session ended (went from existing to null)
    else if (!currentSessionId && lastSessionId) {
      console.log("Session ended, closing window");
      setMessagingState("hidden");
      setLastSessionId(null);
    }
  }, [session?.id, lastSessionId, userClosedSessionIds]);

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

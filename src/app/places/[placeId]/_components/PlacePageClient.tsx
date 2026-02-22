// src/app/places/[placeId]/_components/PlacePageClient.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCheckinsPolling } from "@/hooks/useCheckinsPolling";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";
import { LoadingState, ErrorState } from "@/components/ui/data-states";
import { MessageErrorBoundary } from "@/components/error_boundaries/MessageErrorBoundary";
import type { UserId, PlaceId } from "@/lib/types/database";
import type { PlaceVerificationDetails } from "@/lib/types/database"; // NEW
import { PlaceDetails } from "./PlaceDetails";
import { SimpleMessagingWindow } from "./SimpleMessagingWindow";
import { VerificationModal } from "@/components/verification/VerificationModal"; // NEW
import router from "next/router";

type PlacePageClientProps = {
  placeId: PlaceId;
  userId: UserId;
  placeInfo: {
    id: PlaceId;
    name: string;
    address: string;
  };
  verificationDetails: PlaceVerificationDetails | null; // NEW
  isPrimed: boolean;
};

type MessagingState = "hidden" | "active";

export function PlacePageClient({
  placeId,
  userId,
  placeInfo,
  verificationDetails, // NEW
  isPrimed,
}: PlacePageClientProps) {
  // ============================================
  // MESSAGING STATE
  // ============================================
  const [messagingState, setMessagingState] =
    useState<MessagingState>("hidden");

  // NEW: Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Track which sessions user has explicitly closed
  const [userClosedSessionIds, setUserClosedSessionIds] = useState<Set<string>>(
    new Set(),
  );

  // Track last session ID to detect changes (new session created)
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  // Track if we've completed the initial session load
  const hasInitializedSessionRef = useRef(false);

  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useRealtimeMessageSession(userId, placeId);

  // ============================================
  // POLLING FOR CHECKINS
  // ============================================
  const {
    data: checkins = [],
    isLoading: checkinsLoading,
    error: checkinsError,
    refetch: refetchCheckins,
  } = useCheckinsPolling(placeId, 5000);

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

  const userCheckinLoading =
    checkinsLoading || (checkins.length > 0 && !currentUserCheckin);
  const userHasActiveCheckin = !userCheckinLoading && !!currentUserCheckin;

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
    if (session?.id) {
      setUserClosedSessionIds((prev) => new Set(prev).add(session.id));
    }
  }, [session?.id]);

  // ============================================
  // SESSION CHANGE DETECTION
  // ============================================
  useEffect(() => {
    const currentSessionId = session?.id ?? null;

    if (sessionLoading) {
      return;
    }

    if (!hasInitializedSessionRef.current) {
      hasInitializedSessionRef.current = true;
      setLastSessionId(currentSessionId);
      console.log("Initial session state after load:", currentSessionId);
      return;
    }

    if (currentSessionId && currentSessionId !== lastSessionId) {
      console.log("Session changed:", lastSessionId, "->", currentSessionId);

      if (!userClosedSessionIds.has(currentSessionId)) {
        console.log("Auto-opening messaging window for session");
        setMessagingState("active");
      } else {
        console.log(
          "User previously closed this session, keeping window hidden",
        );
      }

      setLastSessionId(currentSessionId);
    } else if (!currentSessionId && lastSessionId) {
      console.log("Session ended, closing window");
      setMessagingState("hidden");
      setLastSessionId(null);
    }
  }, [session?.id, sessionLoading, lastSessionId, userClosedSessionIds]);

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
        verificationDetails={verificationDetails} // ← NEW: Pass to PlaceDetails
        onOpenVerificationModal={() => setShowVerificationModal(true)} // ← NEW
      />

      {/* Messaging Window */}
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

      {/* NEW: Verification Modal */}
      {verificationDetails?.isVerified && (
        <VerificationModal
          open={showVerificationModal}
          onOpenChange={setShowVerificationModal}
          details={verificationDetails}
          placeName={placeInfo.name}
        />
      )}
    </div>
  );
}

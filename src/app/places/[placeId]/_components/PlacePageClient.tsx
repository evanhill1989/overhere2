// src/app/places/[placeId]/_components/PlacePageClient.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";

import { EphemeralSessionWindow } from "@/app/places/[placeId]/_components/EphemeralSessonWindow";
import { MessageInput } from "@/components/MessageInput";

import { LoadingState, ErrorState } from "@/components/ui/data-states";
import { MessageErrorBoundary } from "@/components/error_boundaries/MessageErrorBoundary";

import type { UserId, PlaceId } from "@/lib/types/database";
import { PlaceDetails } from "./PlaceDetails";
import router from "next/router";

type PlacePageClientProps = {
  placeId: PlaceId;
  userId: UserId;
  placeInfo: {
    id: PlaceId;
    name: string;
    address: string;
  };
};

// Enhanced messaging window states
type MessagingState =
  | "hidden" // Not showing messaging interface
  | "opening" // Transitioning to messaging interface
  | "active" // Messaging interface is active
  | "minimized" // Messaging interface is minimized but session active
  | "closing"; // Transitioning away from messaging interface

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
  // ENHANCED MESSAGING STATE MANAGEMENT
  // ============================================
  const [messagingState, setMessagingState] =
    useState<MessagingState>("hidden");
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [messagingError, setMessagingError] = useState<string | null>(null);
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);

  // ============================================
  // REALTIME SUBSCRIPTIONS
  // ============================================
  const {
    data: checkins = [],
    isLoading: realtimeLoading,
    error: realtimeError,
  } = useRealtimeCheckins(placeId);

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
  const isLoading = sessionLoading || userCheckinLoading; // ← Add userCheckinLoading
  const hasError = realtimeError || sessionError;

  // ============================================
  // RENDER STATES
  // ============================================

  // ✅ New security check: User must have active check-in to see place content

  // Combined loading/error states

  const errorMessage =
    realtimeError?.message ||
    sessionError?.message ||
    "Failed to load place data";

  // ============================================
  // MESSAGING WINDOW MANAGEMENT FUNCTIONS
  // ============================================

  const openMessagingWindow = useCallback(
    (sessionId?: string) => {
      console.log("🪟 Opening messaging window", { sessionId, messagingState });
      setMessagingError(null);
      setMessagingState("opening");

      // Smooth transition to active state
      setTimeout(() => {
        setMessagingState("active");
      }, 100);
    },
    [messagingState],
  );

  const closeMessagingWindow = useCallback(() => {
    console.log("🚪 Closing messaging window", { messagingState });
    setMessagingState("closing");

    // Smooth transition back to hidden
    setTimeout(() => {
      setMessagingState("hidden");
      setShouldAutoOpen(false);
    }, 200);
  }, [messagingState]);

  const minimizeMessagingWindow = useCallback(() => {
    console.log("📱 Minimizing messaging window");
    setMessagingState("minimized");
  }, []);

  const restoreMessagingWindow = useCallback(() => {
    console.log("📱 Restoring messaging window");
    setMessagingState("active");
  }, []);

  const handleMessagingError = useCallback((error: string) => {
    console.error("❌ Messaging error:", error);
    setMessagingError(error);
    setMessagingState("hidden");
  }, []);

  const resetMessagingError = useCallback(() => {
    setMessagingError(null);
    if (session) {
      setMessagingState("active");
    }
  }, [session]);

  // ============================================
  // SESSION CHANGE DETECTION & AUTO-MANAGEMENT
  // ============================================
  useEffect(() => {
    // Track session changes for intelligent window management
    if (session?.id && session.id !== lastSessionId) {
      console.log("🔄 New session detected:", session.id);
      setLastSessionId(session.id);

      // Auto-open messaging window for new sessions
      if (shouldAutoOpen || messagingState === "hidden") {
        openMessagingWindow(session.id);
      }
    } else if (!session && lastSessionId) {
      console.log("🔚 Session ended:", lastSessionId);
      setLastSessionId(null);
      closeMessagingWindow();
    }
  }, [
    session,
    lastSessionId,
    shouldAutoOpen,
    messagingState,
    openMessagingWindow,
    closeMessagingWindow,
  ]);

  // Auto-open messaging when session becomes available
  useEffect(() => {
    if (session && !sessionLoading && messagingState === "hidden") {
      console.log("✅ Session available, auto-opening messaging interface");
      setShouldAutoOpen(true);
      openMessagingWindow(session.id);
    }
  }, [session, sessionLoading, messagingState, openMessagingWindow]);

  // ============================================
  // WINDOW STATE MANAGEMENT
  // ============================================
  const shouldShowMessagingWindow =
    session &&
    (messagingState === "opening" ||
      messagingState === "active" ||
      messagingState === "closing");

  const shouldShowMinimizedIndicator =
    session && messagingState === "minimized";

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
        <ErrorState title="Unable to load place" message={errorMessage} />
      </div>
    );
  }

  // ============================================
  // MESSAGING WINDOW RENDER
  // ============================================
  if (shouldShowMessagingWindow && session) {
    return (
      <MessageErrorBoundary onReset={resetMessagingError}>
        <div
          className={`messaging-window-container ${
            messagingState === "opening" ? "animate-slide-in" : ""
          } ${messagingState === "closing" ? "animate-slide-out" : ""}`}
        >
          <EphemeralSessionWindow
            session={{
              id: session.id,
              placeId: session.placeId,
              initiatorId: session.initiatorId,
              initiateeId: session.initiateeId,
            }}
            currentUserId={userId}
            checkinId={currentCheckinId}
            onBack={closeMessagingWindow}
            onMinimize={minimizeMessagingWindow}
            place={{ name: placeInfo.name, address: placeInfo.address }}
            windowState={messagingState}
            error={messagingError}
          >
            {currentCheckinId && (
              <MessageInput
                sessionId={session.id}
                senderCheckinId={currentCheckinId}
                onError={handleMessagingError}
              />
            )}
          </EphemeralSessionWindow>
        </div>
      </MessageErrorBoundary>
    );
  }

  // ============================================
  // MAIN PLACE DETAILS RENDER
  // ============================================
  return (
    <div className="relative">
      {/* Minimized messaging indicator */}
      {shouldShowMinimizedIndicator && (
        <div className="fixed right-4 bottom-4 z-50">
          <button
            onClick={restoreMessagingWindow}
            className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg transition-shadow hover:shadow-xl"
            aria-label="Restore messaging window"
          >
            💬
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500"></span>
          </button>
        </div>
      )}

      <PlaceDetails
        place={placeInfo}
        checkins={checkins}
        currentUserId={userId}
        activeSession={session ?? undefined}
        onResumeSession={() => {
          setShouldAutoOpen(true);
          openMessagingWindow(session?.id);
        }}
        onOpenMessaging={openMessagingWindow}
        isCheckinsLoading={realtimeLoading}
        checkinsError={realtimeError}
        messagingState={messagingState}
        hasActiveSession={!!session}
      />
    </div>
  );
}

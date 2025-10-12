// src/app/places/[placeId]/_components/PlacePageClient.tsx
"use client";

import { useRef, useState } from "react";
import type { UserId, PlaceId } from "@/lib/types/database";

// import { CheckedInUsers } from "./CheckedInUsers";
// import { IncomingRequestsSection } from "./IncomingRequestsSection";
// import { ActiveSessionWindow } from "./ActiveSessionWindow";
import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";
import { useRealtimeMessageRequests } from "@/hooks/realtime-hooks/useRealtimeMessageRequests";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";
import { LoadingState, ErrorState } from "@/components/ui/data-states";
import PlaceHeader from "./PlaceHeader";

type PlacePageClientProps = {
  placeId: PlaceId;
  userId: UserId;
  initialPlaceInfo: {
    id: PlaceId;
    name: string;
    address: string;
  };
};

export function PlacePageClient({
  placeId,
  userId,
  initialPlaceInfo,
}: PlacePageClientProps) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`🔄 PlacePageClient render #${renderCount.current}`, {
    placeId,
    userId,
  });

  const [showMessaging, setShowMessaging] = useState(false);

  // ============================================
  // DATA FETCHING - Single source of truth
  // ============================================
  const {
    data: checkins = [],
    isLoading: checkinsLoading,
    error: checkinsError,
    refetch: refetchCheckins,
  } = useRealtimeCheckins(placeId);

  // const {
  //   requests,
  //   isLoading: requestsLoading,
  //   error: requestsError,
  // } = useRealtimeMessageRequests(userId, placeId);

  // const {
  //   data: activeSession,
  //   isLoading: sessionLoading,
  //   error: sessionError,
  // } = useRealtimeMessageSession(userId, placeId);

  // ============================================
  // DERIVED STATE
  // ============================================
  // const currentUserCheckin = checkins.find((c) => c.userId === userId);
  // const otherUsersCheckins = checkins.filter((c) => c.userId !== userId);
  // const incomingRequests = requests.filter(
  //   (r) => r.initiateeId === userId && r.status === "pending",
  // );

  // const isLoading = checkinsLoading || requestsLoading || sessionLoading;
  // const hasError = checkinsError || requestsError || sessionError;

  // ============================================
  // AUTO-SHOW MESSAGING IF SESSION EXISTS
  // ============================================
  // if (activeSession && !showMessaging) {
  //   return (
  //     <ActiveSessionWindow
  //       session={activeSession}
  //       currentUserId={userId}
  //       currentUserCheckinId={currentUserCheckin?.id}
  //       placeInfo={initialPlaceInfo}
  //       onBack={() => setShowMessaging(false)}
  //     />
  //   );
  // }

  // ============================================
  // LOADING & ERROR STATES
  // ============================================
  // if (isLoading) {
  //   return (
  //     <div className="flex min-h-[50vh] items-center justify-center">
  //       <LoadingState message="Loading place details..." />
  //     </div>
  //   );
  // }

  // if (hasError) {
  //   const errorMessage =
  //     checkinsError?.message ||
  //     requestsError?.message ||
  //     sessionError?.message ||
  //     "Failed to load place data";

  //   return (
  //     <div className="flex min-h-[50vh] items-center justify-center">
  //       <ErrorState
  //         title="Unable to load place"
  //         message={errorMessage}
  //         onRetry={() => {
  //           refetchCheckins();
  //         }}
  //       />
  //     </div>
  //   );
  // }

  // ============================================
  // MAIN UI
  // ============================================
  return (
    <div className="space-y-6">
      <PlaceHeader place={initialPlaceInfo} />

      {/* Only show incoming requests if user is checked in
      {currentUserCheckin && incomingRequests.length > 0 && (
        <IncomingRequestsSection
          requests={incomingRequests}
          currentUserId={userId}
        />
      )}

      <CheckedInUsers
        checkins={otherUsersCheckins}
        currentUserId={userId}
        requests={requests}
        placeId={placeId}
        hasActiveSession={!!activeSession}
        onResumeSession={() => setShowMessaging(true)}
      />

      {activeSession && (
        <div className="text-center">
          <button
            onClick={() => setShowMessaging(true)}
            className="text-primary underline"
          >
            💬 Resume messaging
          </button>
        </div>
      )} */}
    </div>
  );
}

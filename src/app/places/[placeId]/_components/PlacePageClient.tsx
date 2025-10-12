// src/app/places/[placeId]/_components/PlacePageClient.tsx
"use client";

import { useState } from "react";
import type { UserId, PlaceId } from "@/lib/types/database";
import PlaceHeader from "./PlaceHeader";
import { CheckedInUsers } from "./CheckedInUsers";
import { useRealtimeCheckins } from "@/hooks/realtime-hooks/useRealtimeCheckins";
import { useRealtimeMessageSession } from "@/hooks/realtime-hooks/useRealtimeMessageSession";
import { LoadingState, ErrorState } from "@/components/ui/data-states";

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
  const [showMessaging, setShowMessaging] = useState(false);

  // Data fetching
  const {
    data: checkins = [],
    isLoading: checkinsLoading,
    error: checkinsError,
    refetch: refetchCheckins,
  } = useRealtimeCheckins(placeId);

  const {
    data: activeSession,
    isLoading: sessionLoading,
    error: sessionError,
  } = useRealtimeMessageSession(userId, placeId);

  // Loading & Error states
  if (checkinsLoading || sessionLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState message="Loading place details..." />
      </div>
    );
  }

  if (checkinsError || sessionError) {
    const errorMessage =
      checkinsError?.message ||
      sessionError?.message ||
      "Failed to load place data";
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

  // Main UI
  return (
    <div className="space-y-6">
      <PlaceHeader place={initialPlaceInfo} />

      <CheckedInUsers
        checkins={checkins}
        currentUserId={userId}
        placeId={placeId}
        hasActiveSession={!!activeSession}
        onResumeSession={() => setShowMessaging(true)}
      />
    </div>
  );
}

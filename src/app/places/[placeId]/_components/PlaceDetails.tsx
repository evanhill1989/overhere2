// PlaceDetails.tsx - Memoize the props to prevent unnecessary re-renders
import { CheckinList } from "./CheckinList";
import type { Checkin, UserId, PlaceId } from "@/lib/types/database";
import IncomingRequests from "./IncomingRequests";
import { memo } from "react";
// ✅ MEMOIZE: IncomingRequests to prevent re-renders when props haven't changed
const MemoizedIncomingRequests = memo(IncomingRequests);

type PlaceDetailsProps = {
  place: { id: PlaceId; name: string; address: string };
  checkins: Checkin[];
  currentUserId: UserId;
  activeSession?: {
    initiatorId: UserId;
    initiateeId: UserId;
  };
  onResumeSession?: () => void;
  isCheckinsLoading: boolean;
  checkinsError: Error | null;
  onCheckinsRetry: () => void;
};

export function PlaceDetails({
  place,
  checkins,
  currentUserId,
  activeSession,
  onResumeSession,
  isCheckinsLoading,
  checkinsError,
}: PlaceDetailsProps) {
  const currentUserCheckin = checkins.find((c) => c.userId === currentUserId);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{place.name}</h1>
        <p className="text-muted-foreground text-sm">{place.address}</p>
      </header>

      {currentUserCheckin && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Incoming Requests</h2>
          {/* ✅ USE MEMOIZED VERSION */}
          <MemoizedIncomingRequests
            currentUserId={currentUserId}
            placeId={place.id}
          />
        </section>
      )}

      <CheckinList
        currentUserId={currentUserId}
        placeId={place.id}
        activeSession={activeSession}
        onResumeSession={onResumeSession}
        checkins={checkins}
        isCheckinsLoading={isCheckinsLoading}
        checkinsError={checkinsError}
      />
    </section>
  );
}

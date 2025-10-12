// src/app/places/[placeId]/_components/PlaceDetails.tsx (ADD MISSING PROPS)
import { CheckinList } from "./CheckinList";
import type { Checkin, UserId, PlaceId } from "@/lib/types/database";
import IncomingRequests from "./IncomingRequests";

type PlaceDetailsProps = {
  place: { id: PlaceId; name: string; address: string };
  checkins: Checkin[];
  currentUserId: UserId;
  activeSession?: {
    initiatorId: UserId;
    initiateeId: UserId;
  };
  onResumeSession?: () => void;
  // ✅ ADD: Missing props that CheckinList needs
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
  onCheckinsRetry,
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
          <IncomingRequests currentUserId={currentUserId} placeId={place.id} />
        </section>
      )}

      <CheckinList
        currentUserId={currentUserId}
        placeId={place.id}
        activeSession={activeSession}
        onResumeSession={onResumeSession}
        // ✅ PASS: The props CheckinList expects
        checkins={checkins}
        isCheckinsLoading={isCheckinsLoading}
        checkinsError={checkinsError}
        onCheckinsRetry={onCheckinsRetry}
      />
    </section>
  );
}

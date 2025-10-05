// src/components/PlaceDetails.tsx (UPDATE)

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
};

export function PlaceDetails({
  place,
  checkins,
  currentUserId,
  activeSession,
  onResumeSession,
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
      />
    </section>
  );
}

export type { PlaceDetailsProps };

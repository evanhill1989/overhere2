import { IncomingRequests } from "@/components/IncomingRequests";
import type { SelectCheckin } from "@/lib/db/types";
import { CheckinList } from "./CheckinList";

type PlaceDetailsProps = {
  place: { id: string; name: string; address: string };
  checkins: SelectCheckin[];
  currentUserId: string;
  activeSession?: {
    initiatorId: string;
    initiateeId: string;
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
    <section className="space-y-6 px-4 py-6">
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

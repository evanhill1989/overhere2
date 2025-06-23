// app/places/[placeId]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { checkinsTable, messageSessionsTable } from "@/lib/schema";
import { PlaceDetails } from "@/components/PlaceDetails";
import { eq, and, or, gt } from "drizzle-orm";

import { Suspense } from "react";

import { EphemeralSessionWindow } from "@/components/EphemeralSessonWindow";
import { MessageInput } from "@/components/MessageInput";
//import { cache } from "react";  //Use this to memoize fetch if needed

import { subHours } from "date-fns";

async function fetchPlaceData(placeId: string, userId: string) {
  const twoHoursAgo = subHours(new Date(), 2);

  const [checkins, session] = await Promise.all([
    db
      .select()
      .from(checkinsTable)
      .where(
        and(
          eq(checkinsTable.placeId, placeId),
          eq(checkinsTable.isActive, true),
        ),
      ),
    db.query.messageSessionsTable.findFirst({
      where: and(
        eq(messageSessionsTable.placeId, placeId),
        or(
          eq(messageSessionsTable.initiatorId, userId),
          eq(messageSessionsTable.initiateeId, userId),
        ),
        gt(messageSessionsTable.createdAt, twoHoursAgo),
      ),
    }),
  ]);

  return { checkins, session };
}

export default async function PlacePage(props: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const userId = user.id;
  // Fetch check-ins at this place
  const { checkins, session } = await fetchPlaceData(placeId, userId);

  if (!checkins || checkins.length === 0) {
    // Optionally show skeleton instead of notFound()
    return notFound();
  }

  const place = {
    id: placeId,
    name: checkins[0].placeName,
    address: checkins[0].placeAddress,
  };

  const currentUserId = user.id;

  const currentCheckin = checkins.find((c) => c.userId === currentUserId);
  const currentCheckinId = currentCheckin?.id;

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <Suspense fallback={<div>Loading place...</div>}>
        {session ? (
          <EphemeralSessionWindow
            session={session}
            currentUserId={currentUserId}
            checkinId={currentCheckinId}
          >
            <MessageInput
              sessionId={session.id}
              senderCheckinId={currentCheckinId}
            />
          </EphemeralSessionWindow>
        ) : (
          <PlaceDetails
            place={place}
            checkins={checkins}
            currentUserId={user.id}
          />
        )}
      </Suspense>
    </main>
  );
}

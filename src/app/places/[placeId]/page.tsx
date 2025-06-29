// app/places/[placeId]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { checkinsTable, messageSessionsTable } from "@/lib/schema";

import { eq, and, or, gt } from "drizzle-orm";

//import { cache } from "react";  //Use this to memoize fetch if needed

import { subHours } from "date-fns";
import { MessageSessionListener } from "@/components/MessageSessionListener";

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
      <MessageSessionListener
        place={place}
        checkins={checkins}
        currentUserId={currentUserId}
        currentCheckinId={currentCheckinId}
        initialSession={session ?? null}
      />
    </main>
  );
}

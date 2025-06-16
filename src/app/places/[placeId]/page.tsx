// app/places/[placeId]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { checkinsTable } from "@/lib/schema";
import { PlaceDetails } from "@/components/PlaceDetails";
import { eq, and } from "drizzle-orm";

import { Suspense } from "react";

export default async function PlacePage(props: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await props.params;
  console.log(placeId, "<<------------placeID in PLACE PAGE!!!!!!!!!!!!!! ");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  // Fetch check-ins at this place
  const checkins = await db
    .select()
    .from(checkinsTable)
    .where(
      and(eq(checkinsTable.placeId, placeId), eq(checkinsTable.isActive, true)),
    );

  if (!checkins || checkins.length === 0) {
    // Optionally show skeleton instead of notFound()
    return notFound();
  }

  const place = {
    id: placeId,
    name: checkins[0].placeName,
    address: checkins[0].placeAddress,
  };

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <Suspense fallback={<div>Loading place...</div>}>
        <PlaceDetails
          place={place}
          checkins={checkins}
          currentUserId={user.id}
        />
      </Suspense>
    </main>
  );
}

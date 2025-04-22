import { db } from "@/index";
import { placesTable, checkinsTable, type SelectCheckin } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import CheckinAndChatController from "./_components/CheckinAndChatController";

const CURRENT_WINDOW_MS = 2 * 60 * 60 * 1000;

type PlaceDetailPageProps = {
  params: Promise<{
    placeId: string;
  }>;
};

export default async function PlaceDetailPage(props: PlaceDetailPageProps) {
  const params = await props.params;
  const { placeId } = params;

  let placeDetails;
  try {
    placeDetails = await db.query.placesTable.findFirst({
      where: eq(placesTable.id, placeId),
    });
  } catch (error) {
    console.error("Database error fetching place details:", error);
  }

  if (!placeDetails) {
    notFound();
  }

  // --- Fetch Current User ---
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const currentUserKindeId = user?.id; // Can be null/undefined if not logged in

  // --- Fetch Recent Check-ins for this Place ---
  let otherCheckins: SelectCheckin[] = [];
  let currentUserCheckin: SelectCheckin | null = null;
  const thresholdTime = new Date(Date.now() - CURRENT_WINDOW_MS);

  try {
    const recentCheckins = await db
      .select()
      .from(checkinsTable)
      .where(
        and(
          eq(checkinsTable.placeId, placeId),
          gt(checkinsTable.createdAt, thresholdTime)
        )
      )
      .orderBy(desc(checkinsTable.createdAt)); // Get most recent first

    if (currentUserKindeId) {
      currentUserCheckin =
        recentCheckins.find((c) => c.userId === currentUserKindeId) ?? null;

      otherCheckins = recentCheckins.filter(
        (c) => c.userId !== currentUserKindeId
      );
    } else {
      otherCheckins = recentCheckins;
    }
  } catch (error) {
    console.error(`DB error fetching checkins for place ${placeId}:`, error);
  }

  return (
    <div className="p-5 font-sans flex flex-col gap-4 max-w-lg mx-auto">
      <header>
        <h1 className="text-3xl text-white font-bold mb-1">
          {placeDetails.name}
        </h1>
        <address className="text-gray-600 not-italic">
          {placeDetails.address}
        </address>
      </header>

      <section className="text-sm text-gray-500 border-t pt-4 mt-4">
        {placeDetails.latitude !== null && placeDetails.longitude !== null && (
          <p className="mb-1">
            Coordinates: {placeDetails.latitude?.toFixed(5)},{" "}
            {placeDetails.longitude?.toFixed(5)}
          </p>
        )}

        <p>
          Data last fetched: {placeDetails.lastFetchedAt.toLocaleDateString()}{" "}
          {placeDetails.lastFetchedAt.toLocaleTimeString()}
        </p>
      </section>
      <CheckinAndChatController
        otherCheckins={otherCheckins}
        placeId={placeId}
        currentUserCheckinId={currentUserCheckin?.id ?? null}
      />
    </div>
  );
}

// app/places/[placeId]/page.tsx

import { db } from "@/index"; // Adjust import path for your db instance
import { placesTable } from "@/db/schema"; // Adjust import path for your schema
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation"; // Import for handling 404

// Define the structure of the props passed to the page component
// 'params' contains the dynamic route segments
type PlaceDetailPageProps = {
  params: Promise<{
    placeId: string; // This must match the folder name '[placeId]'
  }>;
};

export default async function PlaceDetailPage(props: PlaceDetailPageProps) {
  const params = await props.params;
  const { placeId } = params;

  let placeDetails;
  try {
    placeDetails = await db.query.placesTable?.findFirst({
      where: eq(placesTable.id, placeId),
    });
  } catch (error) {
    console.error("Database error fetching place details:", error);
  }

  if (!placeDetails) {
    notFound();
  }

  return (
    <div className="p-5 font-sans flex flex-col gap-4 max-w-lg mx-auto">
      <header>
        <h1 className="text-3xl font-bold mb-1">{placeDetails.name}</h1>
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

      {/* --- Potential Future Sections --- */}
      {/*
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Who's Here Now?</h2>
        {/* TODO: Component to display users currently checked into this placeId
            (This would require fetching check-in data filtered by placeId
             and potentially only showing recent/active check-ins)
      </section>

      <section className="mt-6">
          {/* TODO: Maybe an embedded map using placeDetails.latitude/longitude
      </section>
      */}
    </div>
  );
}

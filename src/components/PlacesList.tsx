// components/PlacesList.tsx

"use client";

import { useRouter } from "next/navigation";
import { usePlaceFinder } from "@/context/PlaceFinderProvider";
import CheckinDialog from "@/components/CheckinDialog";
import { useState } from "react";
import { Place } from "@/lib/types/places";
import { useSession } from "./SessionProvider";

export default function PlacesList() {
  const session = useSession();
  const userId = session?.userId;
  console.log(userId, "userId in PlacesList!!!!!!!!1111");
  const { derivedDisplayedPlaces } = usePlaceFinder();
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const router = useRouter();
  const handlePlaceClick = async (place: Place) => {
    if (!userId) {
      console.warn("Tried to prefetch without a valid userId");
      return;
    }

    try {
      router.prefetch(`/places/${place.place_id}`);

      await fetch(
        `/api/prefetch/place-data?placeId=${place.place_id}&userId=${userId}`,
      );
    } catch (error) {
      console.error("Prefetch error:", error);
    }

    setActivePlace(place);
  };
  return (
    <>
      <div className="border-muted bg-card-foreground border-b px-4 py-3 shadow-md">
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Nearby Places
        </h2>
        <p className="text-muted-foreground text-sm">
          These are real locations near you. Choose one to check in.
        </p>
      </div>

      <ul className="space-y-2 p-4">
        {derivedDisplayedPlaces.map((place) => (
          <li
            key={place.place_id}
            onClick={() => handlePlaceClick(place)}
            className="border-muted hover:bg-accent cursor-pointer rounded border p-3 shadow-sm transition"
          >
            <h3 className="text-base font-medium">{place.name}</h3>
            <p className="text-muted-foreground text-sm">{place.address}</p>
          </li>
        ))}
      </ul>

      {activePlace && (
        <CheckinDialog
          open={!!activePlace}
          onOpenChange={(open) => {
            if (!open) setActivePlace(null);
          }}
          place={activePlace}
        />
      )}
    </>
  );
}

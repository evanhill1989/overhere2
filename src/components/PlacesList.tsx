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
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <div className="border-muted shrink-0 px-4 py-5">
        <h2 className="text-xl font-bold tracking-tight">Nearby Places</h2>
        <p className="text-muted-foreground text-sm">
          These are real locations near you. Choose one to check in.
        </p>
      </div>

      {/* Scrollable list */}
      <ul className="grow space-y-2 overflow-y-auto p-4">
        {derivedDisplayedPlaces.map((place) => (
          <li
            key={place.place_id}
            onClick={() => handlePlaceClick(place)}
            className="border-muted hover:bg-accent hover:text-secondary-foreground cursor-pointer rounded border p-3 shadow-sm transition"
          >
            <h3 className="text-base font-medium">{place.name}</h3>
            <p className="text-muted-foreground text-sm">{place.address}</p>
          </li>
        ))}
      </ul>

      {/* Dialog */}
      {activePlace && (
        <CheckinDialog
          open={!!activePlace}
          onOpenChange={(open) => !open && setActivePlace(null)}
          place={activePlace}
        />
      )}
    </div>
  );
}

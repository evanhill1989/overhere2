"use client";

import { useRouter } from "next/navigation";
import { usePlaceFinder } from "@/providers/PlaceFinderProvider";
import CheckinDialog from "@/components/CheckinDialog";
import { useState } from "react";
// ✅ Import the canonical Place entity type
import { type Place } from "@/lib/types/database";
import { useSession } from "./SessionProvider";
import { usePlaceDataPrefetch } from "@/hooks/usePlaceDataPrefetch";
// ✅ Import all necessary branded types from core
import { type PlaceId, type UserId } from "@/lib/types/core";

export default function PlacesList() {
  const session = useSession();
  // ✅ FIX 1: Use nullish coalescing to ensure the result is UserId or null
  const userId: UserId | null = session?.userId ?? null;

  const { derivedDisplayedPlaces } = usePlaceFinder();

  // The state now uses the canonical Place type
  const [activePlace, setActivePlace] = useState<Place | null>(null);

  const router = useRouter();
  const { prefetchPlaceData } = usePlaceDataPrefetch();

  const handlePlaceClick = async (place: Place) => {
    if (!userId) {
      console.warn("Tried to prefetch without a valid userId");
      return;
    }

    // ✅ FIX 2: Use the canonical property name 'id' instead of 'place_id'
    const placeId = place.id;

    try {
      // ✅ FIX 2: Update router prefetch path to use the 'id' property
      router.prefetch(`/places/${placeId}`);

      // ✅ FIX 2: Pass the 'id' property and the branded userId
      await prefetchPlaceData(placeId, userId);
    } catch (error) {
      console.error("Prefetch error:", error);
    }

    setActivePlace(place);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable list */}
      <ul className="grow space-y-2 overflow-y-auto p-4">
        {derivedDisplayedPlaces.map((place) => (
          <li
            // ✅ FIX 3a: Use place.id for the key
            key={place.id}
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
          // ✅ FIX 3b: Pass the canonical Place entity (requires CheckinDialog to be updated)
          place={activePlace}
        />
      )}
    </div>
  );
}

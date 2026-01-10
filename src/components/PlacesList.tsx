// src/components/PlacesList.tsx
"use client";

import { useRouter } from "next/navigation";
import { usePlaceFinder } from "@/providers/PlaceFinderProvider";
import CheckinDialog from "@/components/CheckinDialog";
import { useState } from "react";
import { type Place } from "@/lib/types/database";
import { useSession } from "./SessionProvider";
import { usePlaceDataPrefetch } from "@/hooks/usePlaceDataPrefetch";
import { type UserId } from "@/lib/types/core";

export default function PlacesList() {
  const session = useSession();
  const userId: UserId | null = session?.userId ?? null;

  const { derivedDisplayedPlaces } = usePlaceFinder();
  const [activePlace, setActivePlace] = useState<Place | null>(null);

  const router = useRouter();
  const { prefetchPlaceData } = usePlaceDataPrefetch();

  const handlePlaceClick = async (place: Place) => {
    if (!userId) {
      return;
    }

    const placeId = place.id;

    try {
      router.prefetch(`/places/${placeId}`);
      await prefetchPlaceData(placeId, userId);
    } catch {
      // Silently handle prefetch errors
    }

    setActivePlace(place);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable list */}
      <ul className="grow space-y-2 overflow-y-auto p-4">
        {derivedDisplayedPlaces.map((place, index) => {
          return (
            <li
              // ✅ TEMPORARY FIX: Use index as fallback if place.id is problematic
              key={place.id || `place-${index}`}
              onClick={() => handlePlaceClick(place)}
              className="bg-background/85 border-muted hover:bg-accent hover:text-secondary-foreground cursor-pointer rounded border p-3 shadow-sm transition"
            >
              <h3 className="text-base font-medium">{place.name}</h3>
              <p className="text-muted-foreground text-sm">{place.address}</p>
            </li>
          );
        })}
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

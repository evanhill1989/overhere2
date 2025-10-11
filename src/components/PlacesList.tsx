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

  // ✅ DEBUG: Let's see what the data actually looks like
  console.log("🔍 derivedDisplayedPlaces:", derivedDisplayedPlaces);
  console.log("🔍 First place:", derivedDisplayedPlaces[0]);
  console.log("🔍 First place.id:", derivedDisplayedPlaces[0]?.id);
  console.log(
    "🔍 typeof first place.id:",
    typeof derivedDisplayedPlaces[0]?.id,
  );

  const handlePlaceClick = async (place: Place) => {
    if (!userId) {
      console.warn("Tried to prefetch without a valid userId");
      return;
    }

    const placeId = place.id;

    try {
      router.prefetch(`/places/${placeId}`);
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
        {derivedDisplayedPlaces.map((place, index) => {
          // ✅ DEBUG: Log each place's key
          console.log(`🔍 Place ${index}:`, {
            id: place.id,
            hasId: !!place.id,
            idType: typeof place.id,
            idValue: place.id,
            name: place.name,
          });

          return (
            <li
              // ✅ TEMPORARY FIX: Use index as fallback if place.id is problematic
              key={place.id || `place-${index}`}
              onClick={() => handlePlaceClick(place)}
              className="border-muted hover:bg-accent hover:text-secondary-foreground cursor-pointer rounded border p-3 shadow-sm transition"
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

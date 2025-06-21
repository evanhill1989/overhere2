"use client";

import { useRouter } from "next/navigation";
import { usePlaceFinder } from "@/context/PlaceFinderProvider";
import CheckinDialog from "@/components/CheckinDialog";
import { useState } from "react";
import { Place } from "@/lib/types/places";
import { createClient } from "@/utils/supabase/client";

export default function PlacesList() {
  const { derivedDisplayedPlaces } = usePlaceFinder();
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const router = useRouter();

  const handlePlaceClick = async (place: Place) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn("No user found, skipping prefetch");
        return;
      }

      router.prefetch(`/places/${place.place_id}`);

      await fetch(
        `/api/prefetch/place-data?placeId=${place.place_id}&userId=${user.id}`,
      );
    } catch (error) {
      console.error("Prefetch error:", error);
    }

    setActivePlace(place);
  };

  return (
    <>
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

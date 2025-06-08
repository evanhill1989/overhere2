// components/PlacesList.tsx
"use client";

import { usePlaceFinder } from "@/context/PlaceFinderProvider";
import CheckinDialog from "./CheckinDialog";
import { useState } from "react";
import { Place } from "@/types/places";

export default function PlacesList() {
  const { derivedDisplayedPlaces } = usePlaceFinder();
  const [activePlace, setActivePlace] = useState<Place | null>(null);

  return (
    <>
      <ul className="space-y-2 p-4">
        {derivedDisplayedPlaces.map((place) => (
          <li
            key={place.place_id}
            onClick={() => setActivePlace(place)}
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

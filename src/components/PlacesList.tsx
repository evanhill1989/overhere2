// src/components/PlacesList.tsx (or your path to it)
"use client";

import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";
import { CheckCircle2 } from "lucide-react";
// GSAP imports and logic for test boxes removed for this specific refactor focus

interface PlacesListProps {
  displayedPlaces: Place[];
  currentUserLocation: LocationData | null; // Kept for context, might not be used directly here now
  onListItemClick: (place: Place) => void; // Callback when a list item is clicked
}

export default function PlacesList({
  displayedPlaces,

  onListItemClick,
}: PlacesListProps) {
  return (
    <ul className="space-y-1 pb-2">
      {displayedPlaces.map((place) => (
        <li key={place.id}>
          <button
            onClick={() => onListItemClick(place)}
            className="hover:bg-muted hover:border-border focus:ring-primary focus:border-primary w-full rounded border border-transparent p-2 text-left focus:ring-1 focus:outline-none"
            aria-label={`Check in at ${place.name}`}
          >
            <div className="flex items-center gap-1">
              <span className="font-medium">{place.name}</span>
              {place.isVerified && (
                <span title="Verified by overHere">
                  <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                </span>
              )}
            </div>
            <br />
            <span className="text-muted-foreground text-xs">
              {place.address}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// src/components/PlacesList.tsx
"use client";

import { usePlaceFinder } from "@/context/PlaceFinderProvider"; // Use the hook
import { CheckInDialog } from "./CheckInDialog";

export default function PlacesList() {
  const { derivedDisplayedPlaces, userLocation } = usePlaceFinder(); // Get data directly from context

  if (derivedDisplayedPlaces.length === 0) {
    return (
      <p className="text-muted-foreground p-4 text-center">No places found.</p>
    );
  }

  return (
    <ul className="space-y-1 pb-2">
      {derivedDisplayedPlaces.map((place) => (
        <li className="flex" key={place.id}>
          <CheckInDialog place={place} currentUserLocation={userLocation} />
        </li>
      ))}
    </ul>
  );
}

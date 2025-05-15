"use client";

import { CheckInDialog } from "./CheckInDialog";

import type { Place } from "@/types/places";
import type { LocationData } from "@/hooks/useGeolocation";
interface PlacesListProps {
  displayedPlaces: Place[];
  currentUserLocation: LocationData | null;
}

export default function PlacesList({
  displayedPlaces,
  currentUserLocation,
}: PlacesListProps) {
  return (
    <>
      <div>
        <ul className="space-y-1 pb-2">
          {displayedPlaces.map((place) => (
            <li className="flex" key={place.id}>
              <CheckInDialog
                place={place}
                currentUserLocation={currentUserLocation}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

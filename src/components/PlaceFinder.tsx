"use client";

import { PlaceFinderProvider } from "@/context/PlaceFinderProvider";
import PlaceFinderUI from "@/components/PlaceFinderUI";

export default function PlaceFinder() {
  return (
    <PlaceFinderProvider>
      <PlaceFinderUI />
    </PlaceFinderProvider>
  );
}

"use client";

// Import Hooks

import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";

// Import Components
import { LocationFinder } from "@/components/LocationFinder";
import { PlacesSelectionForm } from "@/components/PlacesSelectionForm";
import { useGeolocation } from "@/hooks/useGeolocation";

import dynamic from "next/dynamic";

const UserMap = dynamic(
  () => import("@/components/UserMap").then((mod) => mod.UserMap),
  {
    ssr: false,
    loading: () => <p>Loading map...</p>,
  }
);

export default function Home() {
  // Use Custom Hooks
  const {
    location,
    error: locationError,
    isLoading: isLoadingLocation,
    requestLocation,
  } = useGeolocation();

  const {
    places,
    error: placesError,
    isLoading: isLoadingPlaces,
    // refetch: refetchPlaces, // uncomment if manual refetch needed
  } = useNearbyPlaces(location); // Pass location data to the places hook

  return (
    <div className="p-5 font-sans flex flex-col gap-4 max-w-md mx-auto">
      <LocationFinder
        location={location}
        error={locationError}
        isLoading={isLoadingLocation}
        onRequestLocation={requestLocation}
        isPlacesLoading={isLoadingPlaces} // Pass this down to disable button
      />
      {location && !isLoadingLocation && (
        <UserMap center={location} places={places} zoom={20} /> // Pass location and places
      )}
      {!location && (
        <UserMap
          center={{ latitude: 27.7677, longitude: -82.6427 }} // Default center if no location
          places={[]} // No places to show
        />
      )}
      <PlacesSelectionForm
        places={places}
        isLoading={isLoadingPlaces}
        error={placesError}
      />
    </div>
  );
}

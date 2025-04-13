// src/app/page.tsx (or your Home component file)
"use client"; // Still needed because it uses custom hooks with useState/useEffect

// Import Hooks

import { useNearbyPlaces } from "@/hooks/useNearbyPlaces"; // Adjust path

// Import Components
import { Header } from "@/components/Header"; // Adjust path
import { LocationFinder } from "@/components/LocationFinder"; // Adjust path
import { PlacesSelectionForm } from "@/components/PlacesSelectionForm"; // Adjust path
import { useGeolocation } from "@/hooks/useGeolocation";

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
      <Header />

      <LocationFinder
        location={location}
        error={locationError}
        isLoading={isLoadingLocation}
        onRequestLocation={requestLocation}
        isPlacesLoading={isLoadingPlaces} // Pass this down to disable button
      />

      <PlacesSelectionForm
        places={places}
        isLoading={isLoadingPlaces}
        error={placesError}
        // Note: Check-in logic is now self-contained within PlacesSelectionForm
      />

      {/*
         The 'Selected: Place Name' and separate 'Confirm Check In' button
         are removed in this refactor, simplifying to a direct form submission.
         The check-in result is displayed by PlacesSelectionForm itself.
         If you absolutely need the separate confirmation section,
         you would need to:
         1. Add an onChange handler to the radio buttons in PlacesSelectionForm
            to lift the selected place ID *or* the full Place object up to Home.
         2. Store this selected place in Home's state.
         3. Conditionally render the confirmation section in Home based on this state.
         4. Change PlacesSelectionForm to *not* submit directly, but maybe call a function passed from Home.
         5. The button in the confirmation section would trigger the server action (perhaps still using useActionState, but initiated differently).
         This adds complexity back, so consider if the direct form submission model works for your UX.
       */}
    </div>
  );
}
